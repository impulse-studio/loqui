use crate::error::AppError;
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use crate::storage::transcripts::TranscriptStore;

#[tauri::command]
pub async fn get_config(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_all_config().map_err(AppError::from)
}

#[tauri::command]
pub async fn set_config(
    key: String,
    value: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.set_config(&key, &value).map_err(AppError::from)
}

#[tauri::command]
pub async fn clear_all_data(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.clear_all_data().map_err(AppError::from)
}

#[tauri::command]
pub async fn export_transcripts(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let transcripts = {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        db.get_transcripts(None, None, i64::MAX, 0)?
    };
    let json = serde_json::to_string_pretty(&transcripts)?;
    std::fs::write(&path, json)?;
    Ok(())
}
