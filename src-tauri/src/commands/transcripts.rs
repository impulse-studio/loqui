use crate::error::AppError;
use crate::state::AppState;
use crate::storage::transcripts::{ActivityRow, TranscriptRow, TranscriptStore};

#[tauri::command]
pub async fn get_transcripts(
    search: Option<String>,
    filter: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TranscriptRow>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_transcripts(search, filter, limit.unwrap_or(50), offset.unwrap_or(0))
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn get_transcript(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<TranscriptRow, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_transcript(&id).map_err(AppError::from)
}

#[tauri::command]
pub async fn delete_transcript(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.delete_transcript(&id).map_err(AppError::from)
}

#[tauri::command]
pub async fn get_transcript_stats(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_transcript_stats().map_err(AppError::from)
}

#[tauri::command]
pub async fn get_activity(
    days: i64,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ActivityRow>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_activity(days).map_err(AppError::from)
}
