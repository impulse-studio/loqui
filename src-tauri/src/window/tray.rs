use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const ICON_BYTES: &[u8] = include_bytes!("../../icons/tray-icon@2x.png");

pub fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "Show Dashboard").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Loqui").build(app)?;

    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    let icon = Image::from_bytes(ICON_BYTES)?;

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Loqui")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
