use crate::audio::capture::AudioCapture;
use crate::error::AppError;
use crate::stt::model_manager;
use crate::stt::types::TranscriptionResult;
use crate::stt::whisper::WhisperEngine;
use crate::state::AppState;
use tauri::Emitter;

#[tauri::command]
pub async fn load_stt_model(
    model_id: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    // Skip if same model is already loaded
    {
        let guard = state.loaded_model_id.lock().map_err(|_| AppError::LockPoisoned)?;
        if guard.as_deref() == Some(&model_id) {
            let _ = app_handle.emit("model-loaded", serde_json::json!({ "modelId": model_id }));
            return Ok(());
        }
    }

    let model_path = model_manager::get_model_path(&model_id)?;
    let engine = WhisperEngine::load(&model_path)?;

    {
        let mut guard = state.whisper.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(engine);
    }
    {
        let mut guard = state.loaded_model_id.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(model_id.clone());
    }

    let _ = app_handle.emit("model-loaded", serde_json::json!({ "modelId": model_id }));
    Ok(())
}

#[tauri::command]
pub async fn start_recording(
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    let capture = AudioCapture::start(&app_handle)?;

    let mut guard = state
        .audio_capture
        .lock()
        .map_err(|_| AppError::LockPoisoned)?;
    *guard = Some(capture);

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    state: tauri::State<'_, AppState>,
) -> Result<TranscriptionResult, AppError> {
    let buffer = {
        let mut capture_guard = state
            .audio_capture
            .lock()
            .map_err(|_| AppError::LockPoisoned)?;
        let mut capture = capture_guard
            .take()
            .ok_or_else(|| AppError::Audio("no active recording".to_string()))?;
        capture.stop()?
    };

    let whisper_guard = state.whisper.lock().map_err(|_| AppError::LockPoisoned)?;
    let engine = whisper_guard
        .as_ref()
        .ok_or_else(|| AppError::Stt("model not loaded".to_string()))?;

    engine.transcribe(&buffer.samples, None)
}
