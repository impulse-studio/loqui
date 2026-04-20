use crate::error::AppError;
use crate::state::AppState;
use crate::storage::secrets::SecretStore;

fn account_for(provider: &str) -> Result<String, AppError> {
    let provider = provider.trim();
    if provider.is_empty() {
        return Err(AppError::Llm("provider is empty".to_string()));
    }
    match provider {
        "openai" | "anthropic" | "google" => Ok(format!("llm.{provider}")),
        other => Err(AppError::Llm(format!("unknown LLM provider: {other}"))),
    }
}

#[tauri::command]
pub async fn save_llm_api_key(
    provider: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    let trimmed = key.trim();
    if trimmed.is_empty() {
        // Empty save == delete (UX: user cleared the field then hit save)
        return db.delete_api_key(&account);
    }
    db.save_api_key(&account, trimmed)
}

#[tauri::command]
pub async fn has_llm_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.has_api_key(&account)
}

#[tauri::command]
pub async fn delete_llm_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.delete_api_key(&account)
}
