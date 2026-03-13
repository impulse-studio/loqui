use crate::error::AppError;
use tauri::{LogicalSize, Manager, PhysicalPosition, WebviewWindow};

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
