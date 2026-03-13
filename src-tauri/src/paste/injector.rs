use crate::error::AppError;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Write text to clipboard and simulate Cmd+V (macOS) / Ctrl+V (Windows).
/// If `keep_in_clipboard` is false, restore the previous clipboard content after pasting.
pub fn paste_text(app_handle: &AppHandle, text: &str, keep_in_clipboard: bool) -> Result<(), AppError> {
    // 1. Save previous clipboard if we need to restore it
    let previous = if keep_in_clipboard {
        None
    } else {
        app_handle.clipboard().read_text().ok()
    };

    // 2. Write to clipboard
    app_handle
        .clipboard()
        .write_text(text)
        .map_err(|e| AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("clipboard write failed: {e}"),
        )))?;

    // 3. Small delay to ensure clipboard is populated
    std::thread::sleep(std::time::Duration::from_millis(50));

    // 4. Simulate Cmd+V / Ctrl+V
    #[cfg(target_os = "macos")]
    {
        super::macos::simulate_paste()?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        simulate_paste_enigo()?;
    }

    // 5. Restore previous clipboard content if needed
    if let Some(prev) = previous {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let _ = app_handle.clipboard().write_text(prev);
    }

    Ok(())
}

/// Simulate Ctrl+V on Windows/Linux using enigo.
#[cfg(not(target_os = "macos"))]
fn simulate_paste_enigo() -> Result<(), AppError> {
    use enigo::{Enigo, Key, Direction, Settings, Keyboard};

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to create input simulator: {e}"),
        )))?;

    enigo.key(Key::Control, Direction::Press)
        .map_err(|e| AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Paste simulation failed: {e}"),
        )))?;
    enigo.key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Paste simulation failed: {e}"),
        )))?;
    enigo.key(Key::Control, Direction::Release)
        .map_err(|e| AppError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Paste simulation failed: {e}"),
        )))?;

    Ok(())
}
