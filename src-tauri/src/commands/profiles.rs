use crate::error::AppError;
use crate::state::AppState;
use crate::storage::profiles::{ProfileRow, ProfileStore};

#[tauri::command]
pub async fn get_profiles(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ProfileRow>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_profiles().map_err(AppError::from)
}

#[tauri::command]
pub async fn get_profile(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<ProfileRow, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.get_profile(&id).map_err(AppError::from)
}

#[tauri::command]
pub async fn save_profile(
    profile: ProfileRow,
    state: tauri::State<'_, AppState>,
) -> Result<ProfileRow, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.save_profile(&profile).map_err(AppError::from)?;
    Ok(profile)
}

#[tauri::command]
pub async fn delete_profile(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.delete_profile(&id).map_err(AppError::from)
}
