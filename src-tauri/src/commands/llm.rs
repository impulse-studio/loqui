use crate::commands::model_helpers;
use crate::error::AppError;
use crate::llm::{engine::LlmEngine, model_manager, types::LlmModelStatus};
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use crate::storage::profiles::ProfileStore;
use crate::storage::transcripts::TranscriptStore;
use tauri::Emitter;

#[tauri::command]
pub async fn get_llm_models() -> Result<Vec<LlmModelStatus>, AppError> {
    model_manager::get_models()
}

#[tauri::command]
pub async fn download_llm_model(
    model_id: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    model_helpers::run_download_with_cancel(&state.llm_download_cancel, |token| {
        model_manager::download_model(&model_id, &app_handle, token)
    })
    .await
}

#[tauri::command]
pub async fn cancel_llm_download(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    model_helpers::cancel_download(&state.llm_download_cancel)
}

#[tauri::command]
pub async fn verify_llm_model(model_id: String) -> Result<bool, AppError> {
    model_manager::verify_model(&model_id)
}

#[tauri::command]
pub async fn load_llm_model(
    model_id: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    {
        let guard = state
            .loaded_llm_id
            .lock()
            .map_err(|_| AppError::LockPoisoned)?;
        if guard.as_deref() == Some(&model_id) {
            let _ = app_handle.emit(
                "llm-model-loaded",
                serde_json::json!({ "modelId": model_id }),
            );
            return Ok(());
        }
    }

    let model_path = model_manager::get_model_path(&model_id)?;
    let engine = LlmEngine::load(&model_path)?;

    {
        let mut guard = state.llm.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(engine);
    }
    {
        let mut guard = state
            .loaded_llm_id
            .lock()
            .map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(model_id.clone());
    }

    let _ = app_handle.emit(
        "llm-model-loaded",
        serde_json::json!({ "modelId": model_id }),
    );
    Ok(())
}

#[tauri::command]
pub async fn unload_llm_model(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    {
        let mut guard = state.llm.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = None;
    }
    {
        let mut guard = state
            .loaded_llm_id
            .lock()
            .map_err(|_| AppError::LockPoisoned)?;
        *guard = None;
    }
    Ok(())
}

#[tauri::command]
pub async fn test_refactor(
    text: String,
    system_prompt: String,
    profile_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<crate::llm::types::RefactorResult, AppError> {
    let profile = if let Some(pid) = &profile_id {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        db.get_profile(pid).ok()
    } else {
        None
    };

    let ctx_size = profile.as_ref().map_or(4096, |p| p.context_size as u32);
    let provider = profile
        .as_ref()
        .map_or("local".to_string(), |p| p.llm_provider.clone());
    let full_prompt = crate::agent::refactor::build_system_prompt(&system_prompt);

    if provider != "local" && provider != "disabled" && !provider.is_empty() {
        let first_upper = provider
            .chars()
            .next()
            .map_or(String::new(), |c| c.to_uppercase().to_string() + &provider[1..]);
        let api_key_name = format!("llmApiKey{first_upper}");

        let (api_key, model_name) = {
            let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
            let key = db.get_config(&api_key_name).ok().flatten().unwrap_or_default();
            let model = profile.as_ref().map_or(String::new(), |p| p.llm_model.clone());
            (key, model)
        };

        let result = crate::llm::remote::refactor_remote(
            &provider,
            &api_key,
            &model_name,
            &full_prompt,
            &text,
        )
        .await?;

        return Ok(crate::llm::types::RefactorResult {
            text: crate::agent::refactor::extract_refined_text(&result.text),
            model_used: format!("{provider}/{model_name}"),
            duration_ms: result.duration_ms,
            input_tokens: result.input_tokens,
            output_tokens: result.output_tokens,
        });
    }

    let guard = state.llm.lock().map_err(|_| AppError::LockPoisoned)?;
    let engine = guard
        .as_ref()
        .ok_or_else(|| AppError::Llm("no LLM model loaded".to_string()))?;

    let mut result = engine.generate(&full_prompt, &text, ctx_size)?;
    result.text = crate::agent::refactor::extract_refined_text(&result.text);

    let loaded_id = state
        .loaded_llm_id
        .lock()
        .map_err(|_| AppError::LockPoisoned)?;
    result.model_used = loaded_id.clone().unwrap_or_default();

    Ok(result)
}

#[tauri::command]
pub async fn get_detected_apps(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_detected_apps().map_err(AppError::from)
}

#[derive(serde::Serialize)]
pub struct ApiKeyStatus {
    pub openai: bool,
    pub anthropic: bool,
    pub google: bool,
}

#[tauri::command]
pub async fn get_llm_api_key_status(
    state: tauri::State<'_, AppState>,
) -> Result<ApiKeyStatus, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    let has_key = |name: &str| -> bool {
        db.get_config(name)
            .ok()
            .flatten()
            .map_or(false, |v| !v.is_empty())
    };
    Ok(ApiKeyStatus {
        openai: has_key("llmApiKeyOpenai"),
        anthropic: has_key("llmApiKeyAnthropic"),
        google: has_key("llmApiKeyGoogle"),
    })
}

#[tauri::command]
pub async fn fetch_remote_models(
    provider: String,
) -> Result<Vec<crate::llm::remote::RemoteModelEntry>, AppError> {
    crate::llm::remote::list_remote_models(&provider).await
}
