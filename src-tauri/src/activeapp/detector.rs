/// Returns (app_name, window_title) of the currently focused application.
/// Falls back to ("Unknown", "") if detection fails.
pub fn get_frontmost_app() -> (String, String) {
    match active_win_pos_rs::get_active_window() {
        Ok(window) => (window.app_name, window.title),
        Err(_) => ("Unknown".to_string(), String::new()),
    }
}
