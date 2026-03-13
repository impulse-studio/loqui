use crate::error::AppError;
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use crate::window::widget::apply_position_and_size;
use tauri::Manager;

#[tauri::command]
pub async fn apply_widget_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let (position, size, visible) = {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        let position = db
            .get_config("widgetPosition")
            .ok()
            .flatten()
            .unwrap_or_else(|| "bottom-center".to_string());
        let size = db
            .get_config("widgetSize")
            .ok()
            .flatten()
            .unwrap_or_else(|| "medium".to_string());
        let visible = db
            .get_config("widgetVisible")
            .ok()
            .flatten()
            .map_or(true, |v| v == "true");
        (position, size, visible)
    };

    let widget = app
        .get_webview_window("widget")
        .ok_or_else(|| AppError::Custom("Widget window not found".to_string()))?;

    apply_position_and_size(&widget, &position, &size)
        .map_err(|e| AppError::Custom(format!("Failed to apply widget settings: {e}")))?;

    if visible {
        widget.show().map_err(|e| AppError::Custom(e.to_string()))?;
    } else {
        widget.hide().map_err(|e| AppError::Custom(e.to_string()))?;
    }

    Ok(())
}
