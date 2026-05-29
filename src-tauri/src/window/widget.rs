use crate::error::AppError;
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewWindow};

/// Force the widget visible (used when a recording starts), WITHOUT stealing
/// keyboard focus from the user's active app. On macOS the widget is an
/// `NSPanel`; a plain `show()` calls `makeKeyAndOrderFront`, which would steal
/// focus and break paste injection — so we order it front "regardless" instead.
pub fn show(app_handle: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        use tauri_nspanel::ManagerExt;
        if let Ok(panel) = app_handle.get_webview_panel("widget") {
            if !panel.is_visible() {
                panel.order_front_regardless();
            }
            return;
        }
    }

    if let Some(widget) = app_handle.get_webview_window("widget") {
        if !widget.is_visible().unwrap_or(false) {
            let _ = widget.show();
        }
    }
}

/// Restore the widget to the user's configured visibility. Called when the
/// pipeline returns to idle, so a hidden widget that we surfaced for recording
/// gets hidden again.
pub fn restore_visibility(app_handle: &AppHandle) {
    let state = app_handle.state::<AppState>();
    let visible = state
        .db
        .lock()
        .ok()
        .and_then(|db| db.get_config("widgetVisible").ok().flatten())
        .map_or(true, |v| v == "true");

    if visible {
        return;
    }

    #[cfg(target_os = "macos")]
    {
        use tauri_nspanel::ManagerExt;
        if let Ok(panel) = app_handle.get_webview_panel("widget") {
            panel.order_out(None);
            return;
        }
    }

    if let Some(widget) = app_handle.get_webview_window("widget") {
        let _ = widget.hide();
    }
}

pub fn apply_position_and_size(
    widget: &WebviewWindow,
    position: &str,
    size: &str,
) -> Result<(), AppError> {
    let (w, h) = match size {
        "small" => (120.0, 32.0),
        "large" => (200.0, 48.0),
        _ => (160.0, 40.0), // medium (default)
    };

    widget
        .set_size(LogicalSize::new(w, h))
        .map_err(|e| AppError::Window(e.to_string()))?;

    let monitor = widget
        .current_monitor()
        .map_err(|e| AppError::Window(e.to_string()))?
        .ok_or_else(|| AppError::Window("No monitor found".to_string()))?;

    let screen = monitor.size();
    let scale = monitor.scale_factor();
    let screen_w = f64::from(screen.width) / scale;
    let screen_h = f64::from(screen.height) / scale;
    let margin = 60.0;

    let (x, y) = match position {
        "top-left" => (margin, margin),
        "top-center" => ((screen_w - w) / 2.0, margin),
        "top-right" => (screen_w - w - margin, margin),
        "bottom-left" => (margin, screen_h - h - margin),
        "bottom-right" => (screen_w - w - margin, screen_h - h - margin),
        _ => ((screen_w - w) / 2.0, screen_h - h - margin), // bottom-center (default)
    };

    widget
        .set_position(PhysicalPosition::new(
            (x * scale) as i32,
            (y * scale) as i32,
        ))
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
