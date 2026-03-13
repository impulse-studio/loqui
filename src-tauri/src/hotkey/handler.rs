use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

#[cfg(target_os = "macos")]
use super::cgevent_tap;

// ---------------------------------------------------------------------------
// macOS keycode → canonical key name
// ---------------------------------------------------------------------------

fn keycode_to_name(code: u16) -> Option<&'static str> {
    static MAP: std::sync::LazyLock<HashMap<u16, &'static str>> = std::sync::LazyLock::new(|| {
        let mut m = HashMap::new();
        // Modifiers
        m.insert(56, "shift");   // Left Shift
        m.insert(60, "shift");   // Right Shift
        m.insert(58, "alt");     // Left Option
        m.insert(61, "alt");     // Right Option
        m.insert(55, "super");   // Left Command
        m.insert(54, "super");   // Right Command
        m.insert(59, "ctrl");    // Left Control
        m.insert(62, "ctrl");    // Right Control
        m.insert(57, "capslock");
        m.insert(63, "fn");
        // Letters (QWERTY layout keycodes)
        m.insert(0, "a"); m.insert(11, "b"); m.insert(8, "c");
        m.insert(2, "d"); m.insert(14, "e"); m.insert(3, "f");
        m.insert(5, "g"); m.insert(4, "h"); m.insert(34, "i");
        m.insert(38, "j"); m.insert(40, "k"); m.insert(37, "l");
        m.insert(46, "m"); m.insert(45, "n"); m.insert(31, "o");
        m.insert(35, "p"); m.insert(12, "q"); m.insert(15, "r");
        m.insert(1, "s"); m.insert(17, "t"); m.insert(32, "u");
        m.insert(9, "v"); m.insert(13, "w"); m.insert(7, "x");
        m.insert(16, "y"); m.insert(6, "z");
        // Digits
        m.insert(29, "0"); m.insert(18, "1"); m.insert(19, "2");
        m.insert(20, "3"); m.insert(21, "4"); m.insert(23, "5");
        m.insert(22, "6"); m.insert(26, "7"); m.insert(28, "8");
        m.insert(25, "9");
        // Special keys
        m.insert(49, "space");
        m.insert(36, "enter");
        m.insert(48, "tab");
        m.insert(51, "backspace");
        m.insert(117, "delete");
        m.insert(53, "escape");
        m.insert(126, "up");
        m.insert(125, "down");
        m.insert(123, "left");
        m.insert(124, "right");
        m.insert(27, "minus");
        m.insert(24, "plus");
        m.insert(33, "[");
        m.insert(30, "]");
        m.insert(42, "\\");
        m.insert(41, ";");
        m.insert(39, "'");
        m.insert(43, ",");
        m.insert(47, ".");
        m.insert(44, "/");
        m.insert(50, "`");
        // Function keys
        m.insert(122, "f1"); m.insert(120, "f2"); m.insert(99, "f3");
        m.insert(118, "f4"); m.insert(96, "f5"); m.insert(97, "f6");
        m.insert(98, "f7"); m.insert(100, "f8"); m.insert(101, "f9");
        m.insert(109, "f10"); m.insert(103, "f11"); m.insert(111, "f12");
        m
    });
    MAP.get(&code).copied()
}

// ---------------------------------------------------------------------------
// Shared target type
// ---------------------------------------------------------------------------

pub type HotkeyTarget = Arc<Mutex<HashSet<String>>>;

pub fn new_target() -> HotkeyTarget {
    Arc::new(Mutex::new(HashSet::new()))
}

/// Parse a shortcut string like `"shift+alt+space"` into a set of key names.
pub fn parse_shortcut(shortcut: &str) -> HashSet<String> {
    shortcut
        .split('+')
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .collect()
}

// ---------------------------------------------------------------------------
// Listener (macOS)
// ---------------------------------------------------------------------------

/// Start the global keyboard listener. Calls the agent pipeline
/// when the target key combination is pressed / released.
#[cfg(target_os = "macos")]
pub fn start_listener(app_handle: AppHandle, target: HotkeyTarget) {
    let rx = cgevent_tap::start_listener();
    log::info!("Hotkey: listener started, waiting for events");

    std::thread::spawn(move || {
        let mut pressed_names: HashSet<String> = HashSet::new();
        let mut was_active = false;
        let mut event_count: u64 = 0;

        // Track raw keycodes so we can correctly remove on release
        // Multiple keycodes can map to the same name (left/right shift → "shift").
        // We keep track of (keycode → name) for each pressed key.
        let mut pressed_codes: HashMap<u16, String> = HashMap::new();

        while let Ok(event) = rx.recv() {
            event_count += 1;
            // Log first event to confirm CGEventTap is working
            if event_count == 1 {
                log::info!("Hotkey: first key event received — CGEventTap is working");
            }
            if event.pressed {
                if let Some(name) = keycode_to_name(event.key_code) {
                    pressed_codes.insert(event.key_code, name.to_string());
                }
            } else {
                pressed_codes.remove(&event.key_code);
            }

            // Rebuild canonical pressed names from all currently pressed keycodes
            pressed_names.clear();
            for name in pressed_codes.values() {
                pressed_names.insert(name.clone());
            }

            let target_set = target.lock().unwrap_or_else(|e| e.into_inner());
            if target_set.is_empty() {
                continue;
            }

            let is_active = target_set.is_subset(&pressed_names);

            if is_active && !was_active {
                log::info!("Hotkey: combo activated, calling on_press");
                crate::agent::pipeline::on_press(&app_handle);
            } else if !is_active && was_active {
                log::info!("Hotkey: combo released, calling on_release");
                crate::agent::pipeline::on_release(&app_handle);
            }
            was_active = is_active;
        }
        log::error!("Hotkey: event channel closed — CGEventTap thread died (check Accessibility permissions)");
    });
}

// ---------------------------------------------------------------------------
// Listener (Windows / Linux via rdev)
// ---------------------------------------------------------------------------

#[cfg(not(target_os = "macos"))]
fn rdev_key_to_name(key: &rdev::Key) -> Option<&'static str> {
    use rdev::Key::*;
    match key {
        // Modifiers
        ShiftLeft | ShiftRight => Some("shift"),
        Alt | AltGr => Some("alt"),
        MetaLeft | MetaRight => Some("super"),
        ControlLeft | ControlRight => Some("ctrl"),
        CapsLock => Some("capslock"),
        // Letters
        KeyA => Some("a"), KeyB => Some("b"), KeyC => Some("c"),
        KeyD => Some("d"), KeyE => Some("e"), KeyF => Some("f"),
        KeyG => Some("g"), KeyH => Some("h"), KeyI => Some("i"),
        KeyJ => Some("j"), KeyK => Some("k"), KeyL => Some("l"),
        KeyM => Some("m"), KeyN => Some("n"), KeyO => Some("o"),
        KeyP => Some("p"), KeyQ => Some("q"), KeyR => Some("r"),
        KeyS => Some("s"), KeyT => Some("t"), KeyU => Some("u"),
        KeyV => Some("v"), KeyW => Some("w"), KeyX => Some("x"),
        KeyY => Some("y"), KeyZ => Some("z"),
        // Digits
        Num0 => Some("0"), Num1 => Some("1"), Num2 => Some("2"),
        Num3 => Some("3"), Num4 => Some("4"), Num5 => Some("5"),
        Num6 => Some("6"), Num7 => Some("7"), Num8 => Some("8"),
        Num9 => Some("9"),
        // Special keys
        Space => Some("space"),
        Return => Some("enter"),
        Tab => Some("tab"),
        BackSpace => Some("backspace"),
        Delete => Some("delete"),
        Escape => Some("escape"),
        UpArrow => Some("up"),
        DownArrow => Some("down"),
        LeftArrow => Some("left"),
        RightArrow => Some("right"),
        Minus => Some("minus"),
        Equal => Some("plus"),
        LeftBracket => Some("["),
        RightBracket => Some("]"),
        BackSlash => Some("\\"),
        SemiColon => Some(";"),
        Quote => Some("'"),
        Comma => Some(","),
        Dot => Some("."),
        Slash => Some("/"),
        BackQuote => Some("`"),
        // Function keys
        F1 => Some("f1"), F2 => Some("f2"), F3 => Some("f3"),
        F4 => Some("f4"), F5 => Some("f5"), F6 => Some("f6"),
        F7 => Some("f7"), F8 => Some("f8"), F9 => Some("f9"),
        F10 => Some("f10"), F11 => Some("f11"), F12 => Some("f12"),
        _ => None,
    }
}

/// Start the global keyboard listener on Windows/Linux via rdev.
/// Calls the agent pipeline when the target key combination is pressed / released.
#[cfg(not(target_os = "macos"))]
pub fn start_listener(app_handle: AppHandle, target: HotkeyTarget) {
    log::info!("Hotkey: starting rdev listener");

    std::thread::spawn(move || {
        let mut pressed_keys: HashSet<String> = HashSet::new();
        let mut was_active = false;

        if let Err(e) = rdev::listen(move |event| {
            match event.event_type {
                rdev::EventType::KeyPress(key) => {
                    if let Some(name) = rdev_key_to_name(&key) {
                        pressed_keys.insert(name.to_string());
                    }
                }
                rdev::EventType::KeyRelease(key) => {
                    if let Some(name) = rdev_key_to_name(&key) {
                        pressed_keys.remove(name);
                    }
                }
                _ => return,
            }

            let target_set = target.lock().unwrap_or_else(|e| e.into_inner());
            if target_set.is_empty() {
                return;
            }

            let is_active = target_set.is_subset(&pressed_keys);

            if is_active && !was_active {
                log::info!("Hotkey: combo activated, calling on_press");
                crate::agent::pipeline::on_press(&app_handle);
            } else if !is_active && was_active {
                log::info!("Hotkey: combo released, calling on_release");
                crate::agent::pipeline::on_release(&app_handle);
            }
            was_active = is_active;
        }) {
            log::error!("Hotkey: rdev listener failed: {e:?}");
        }
    });
}
