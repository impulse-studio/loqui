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

    // Only persist non-empty hotkeys — empty string is a temporary in-memory
    // pause (used by the test step) and must not overwrite the saved shortcut.
    if !hotkey.is_empty() {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        db.set_config("hotkey", &hotkey)?;
    }

    Ok(())
}
