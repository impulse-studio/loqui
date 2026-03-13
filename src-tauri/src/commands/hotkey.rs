use crate::error::AppError;
use crate::hotkey::handler;
use crate::state::AppState;
use crate::storage::config::ConfigStore;

#[tauri::command]
pub async fn set_hotkey(
    hotkey: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    // Update the live hotkey target (the listener picks it up immediately)
    let new_keys = handler::parse_shortcut(&hotkey);
    {
        let mut target = state.hotkey_target.lock().map_err(|_| AppError::LockPoisoned)?;
        *target = new_keys;
    }

    // Persist to config
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.set_config("hotkey", &hotkey)?;

    Ok(())
}
