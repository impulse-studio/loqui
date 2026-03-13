# Tauri 2 Technical Feasibility Research for Loqui

> **Date**: 2026-03-12
> **Subject**: Comprehensive evaluation of Tauri 2 capabilities for building Loqui -- a desktop speech-to-text companion app
> **Tauri Version**: 2.x (stable, released October 2024)

---

## Table of Contents

1. [Microphone Access (Audio Capture)](#1-microphone-access-audio-capture)
2. [Global Hotkey (System-wide)](#2-global-hotkey-system-wide)
3. [Active Application Detection](#3-active-application-detection)
4. [List Installed Applications](#4-list-installed-applications)
5. [Floating Widget (Always-on-top Window)](#5-floating-widget-always-on-top-window)
6. [Multi-window + System Tray](#6-multi-window--system-tray)
7. [Clipboard Injection (Paste Simulation)](#7-clipboard-injection-paste-simulation)
8. [Whisper Local Inference](#8-whisper-local-inference)
9. [Cross-Platform Support](#9-cross-platform-support)
10. [Mobile Support](#10-mobile-support)
11. [Overall Assessment](#11-overall-assessment)

---

## 1. Microphone Access (Audio Capture)

**Verdict**: Full support

### How

Tauri's Rust backend has full access to native audio APIs via the **`cpal`** crate (Cross-Platform Audio Library). This is the standard Rust crate for low-level audio I/O, maintained by the RustAudio organization. It interfaces directly with platform-specific audio backends:

| Platform | Backend        |
|----------|---------------|
| macOS    | CoreAudio     |
| Windows  | WASAPI        |
| Linux    | ALSA / PulseAudio (via ALSA) |

There are also Tauri-specific plugins:
- **`tauri-plugin-mic-recorder`** -- uses `cpal` + `hound` internally, outputs WAV (16-bit PCM) on desktop, M4A on mobile
- **`tauri-plugin-audio-recorder`** -- similar functionality

For Loqui, using `cpal` directly in the Rust backend provides the most control (sample rate, buffer size, streaming to whisper).

### Code Example

```rust
// Cargo.toml
// [dependencies]
// cpal = "0.15"

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleRate, StreamConfig, BufferSize};
use std::sync::{Arc, Mutex};

fn capture_microphone(audio_buffer: Arc<Mutex<Vec<f32>>>) -> Result<cpal::Stream, Box<dyn std::error::Error>> {
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;

    // 16kHz mono -- exactly what Whisper expects
    let config = StreamConfig {
        channels: 1,
        sample_rate: SampleRate(16000),
        buffer_size: BufferSize::Default,
    };

    let buffer = audio_buffer.clone();
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // Append PCM f32 samples to buffer
            let mut buf = buffer.lock().unwrap();
            buf.extend_from_slice(data);
        },
        move |err| {
            eprintln!("Audio stream error: {}", err);
        },
        None, // no timeout
    )?;

    stream.play()?;
    Ok(stream)
}
```

**Exposing to the frontend via Tauri command:**

```rust
use tauri::State;
use std::sync::{Arc, Mutex};

struct AudioState {
    buffer: Arc<Mutex<Vec<f32>>>,
    stream: Mutex<Option<cpal::Stream>>,
}

#[tauri::command]
fn start_recording(state: State<AudioState>) -> Result<(), String> {
    let stream = capture_microphone(state.buffer.clone())
        .map_err(|e| e.to_string())?;
    *state.stream.lock().unwrap() = Some(stream);
    Ok(())
}

#[tauri::command]
fn stop_recording(state: State<AudioState>) -> Result<Vec<f32>, String> {
    // Drop the stream to stop recording
    *state.stream.lock().unwrap() = None;
    let mut buf = state.buffer.lock().unwrap();
    let data = buf.clone();
    buf.clear();
    Ok(data)
}
```

### macOS Entitlements

On macOS, microphone access requires the `NSMicrophoneUsageDescription` key in `Info.plist`:

```xml
<!-- src-tauri/Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>Loqui needs microphone access for speech-to-text transcription.</string>
```

The community plugin **`tauri-plugin-macos-permissions`** can check/request permissions programmatically:

```rust
// Check microphone permission status before recording
app.plugin(tauri_plugin_macos_permissions::init())?;
```

### Doc Links

- cpal crate: https://crates.io/crates/cpal
- cpal documentation: https://docs.rs/cpal/latest/cpal/
- cpal GitHub (with examples): https://github.com/RustAudio/cpal
- tauri-plugin-mic-recorder: https://github.com/ayangweb/tauri-plugin-mic-recorder
- tauri-plugin-macos-permissions: https://github.com/ayangweb/tauri-plugin-macos-permissions

### Notes

- Most microphones natively run at 44.1kHz or 48kHz. If the device does not support 16kHz natively, you must resample. The `rubato` crate is the standard Rust resampler, or capture at native rate and downsample before feeding to Whisper.
- `cpal` does NOT support iOS/Android. Mobile would require `tauri-plugin-mic-recorder` or native Swift/Kotlin plugins.
- Desktop output is raw PCM f32 -- exactly what `whisper-rs` expects. No format conversion needed.

---

## 2. Global Hotkey (System-wide)

**Verdict**: Full support

### How

The official **`tauri-plugin-global-shortcut`** (v2.x) provides system-wide hotkey registration that works even when the Tauri app is **not focused**. Critically, it supports **separate press and release events** via the `ShortcutState` enum, enabling hold-to-record functionality.

| Feature                      | Supported |
|------------------------------|-----------|
| System-wide hotkey           | Yes       |
| Works when app is unfocused  | Yes       |
| Separate keydown/keyup       | Yes (`ShortcutState::Pressed` / `ShortcutState::Released`) |
| Modifier keys                | Yes (Ctrl, Alt, Shift, Meta/Super) |
| Single key (e.g., F13)      | Yes       |

### Code Example (Rust side)

```rust
// Cargo.toml
// [dependencies]
// tauri-plugin-global-shortcut = "2"

use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    // Hold-to-record: Ctrl+Shift+Space
                    let record_shortcut = Shortcut::new(
                        Some(Modifiers::CONTROL | Modifiers::SHIFT),
                        Code::Space,
                    );

                    if shortcut == &record_shortcut {
                        match event.state() {
                            ShortcutState::Pressed => {
                                // Start recording
                                app.emit("recording-state", "started").unwrap();
                                println!("Recording started (key down)");
                            }
                            ShortcutState::Released => {
                                // Stop recording, trigger transcription
                                app.emit("recording-state", "stopped").unwrap();
                                println!("Recording stopped (key up)");
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Register the shortcut
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Space,
            );
            app.global_shortcut().register(shortcut)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Code Example (JavaScript side)

```javascript
import { register } from '@tauri-apps/plugin-global-shortcut';

// Register from JS side (alternative to Rust side)
await register('CommandOrControl+Shift+Space', (event) => {
  if (event.state === 'Pressed') {
    console.log('Hold-to-record: started');
    startRecording();
  } else if (event.state === 'Released') {
    console.log('Hold-to-record: stopped');
    stopRecording();
  }
});
```

### Permissions Configuration

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "global-shortcut:allow-is-registered"
  ]
}
```

### Doc Links

- Official plugin docs: https://v2.tauri.app/plugin/global-shortcut/
- Rust API docs: https://docs.rs/tauri-plugin-global-shortcut
- JS API reference: https://v2.tauri.app/reference/javascript/global-shortcut/
- crates.io: https://crates.io/crates/tauri-plugin-global-shortcut

### Notes

- **Known issue**: There is a reported bug (#1748) where the handler can be called twice on certain key presses on some platforms. Debouncing in the handler is recommended.
- **Gaming/fullscreen**: Some fullscreen applications (especially games using DirectInput/raw input) may intercept keys before the OS global shortcut layer. Reported in issue #14770. Not relevant for typical Loqui use cases (text editors, browsers, etc.).
- **macOS**: The Accessibility permission is NOT required for global shortcuts (unlike tools like Hammerspoon). The plugin uses the native `CGEventTap` / `NSEvent.addGlobalMonitorForEvents` APIs.
- **Linux Wayland**: Global shortcuts on Wayland are limited by the compositor. X11 works reliably.

---

## 3. Active Application Detection

**Verdict**: Full support

### How

Two primary Rust crates provide this functionality:

| Crate                  | Platforms              | Fields                                                     |
|------------------------|------------------------|------------------------------------------------------------|
| **`active-win-pos-rs`** | macOS, Windows, Linux | `app_name`, `title`, `process_path`, `process_id`, `window_id`, `position` |
| **`x-win`**            | macOS, Windows, Linux | `name`, `title`, `process_id`, `process_path`, `url` (browser), `position`, `size`, `memory` |

**Recommendation**: `active-win-pos-rs` is simpler and sufficient for Loqui. For bundle ID on macOS, you can derive it from the `process_path` using the `core-foundation` crate, or use `x-win` which provides more metadata.

### Code Example

```rust
// Cargo.toml
// [dependencies]
// active-win-pos-rs = "0.8"

use active_win_pos_rs::get_active_window;

#[tauri::command]
fn get_foreground_app() -> Result<serde_json::Value, String> {
    match get_active_window() {
        Ok(window) => Ok(serde_json::json!({
            "app_name": window.app_name,
            "title": window.title,
            "process_path": window.process_path,
            "process_id": window.process_id,
            "window_id": window.window_id,
        })),
        Err(()) => Err("Failed to get active window".to_string()),
    }
}
```

**Deriving macOS bundle ID from process path:**

```rust
#[cfg(target_os = "macos")]
fn get_bundle_id_from_path(process_path: &str) -> Option<String> {
    // macOS apps live in /Applications/AppName.app/Contents/MacOS/binary
    // The bundle is the .app directory
    if let Some(app_pos) = process_path.find(".app/") {
        let app_path = &process_path[..app_pos + 4]; // include ".app"
        // Read bundle ID from Info.plist using core-foundation or plist crate
        let plist_path = format!("{}/Contents/Info.plist", app_path);
        if let Ok(plist) = plist::Value::from_file(&plist_path) {
            if let Some(dict) = plist.as_dictionary() {
                return dict
                    .get("CFBundleIdentifier")
                    .and_then(|v| v.as_string())
                    .map(|s| s.to_string());
            }
        }
    }
    None
}
```

### Doc Links

- active-win-pos-rs: https://crates.io/crates/active-win-pos-rs
- active-win-pos-rs GitHub: https://github.com/dimusic/active-win-pos-rs
- active-win-pos-rs docs: https://docs.rs/active-win-pos-rs
- x-win crate: https://crates.io/crates/x-win
- x-win GitHub: https://github.com/miniben-90/x-win

### Notes

- **macOS caveat**: The `title` field returns an **empty string** unless the app has **Screen Recording** permission granted in System Preferences > Privacy & Security. The `app_name` and `process_path` work without any special permissions.
- **Linux GNOME 41+**: The `x-win` crate requires a GNOME Shell extension to be installed for window detection. `active-win-pos-rs` uses X11 APIs and does not work on pure Wayland without XWayland.
- For Loqui's use case (knowing which app to paste into), `app_name` and `process_path` are sufficient -- the window title is a nice-to-have.

---

## 4. List Installed Applications

**Verdict**: Partial support (via community crates)

### How

Several Rust crates provide this:

| Crate            | macOS | Windows | Linux | Notes                           |
|------------------|-------|---------|-------|---------------------------------|
| **`applications`** | Yes   | Planned | Yes   | Cross-platform, macOS + Linux   |
| **`app-finder`** | Yes   | Yes     | Yes   | Lists apps, retrieves icons     |
| **`installed`**  | Yes   | Yes     | No    | Lists installed software        |

### Code Example

```rust
// Cargo.toml
// [dependencies]
// applications = "0.3"

// Note: The `applications` crate API (macOS + Linux)
use applications::AppInfoContext;

#[tauri::command]
fn list_applications() -> Vec<serde_json::Value> {
    let mut ctx = AppInfoContext::new();
    ctx.refresh_apps().unwrap();

    ctx.get_all_apps()
        .iter()
        .map(|app| serde_json::json!({
            "name": app.name,
            "icon_path": app.icon_path,
        }))
        .collect()
}
```

**macOS native approach (reading /Applications directory):**

```rust
use std::fs;

#[tauri::command]
fn list_macos_apps() -> Vec<String> {
    let mut apps = Vec::new();
    if let Ok(entries) = fs::read_dir("/Applications") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "app") {
                if let Some(name) = path.file_stem() {
                    apps.push(name.to_string_lossy().to_string());
                }
            }
        }
    }
    apps.sort();
    apps
}
```

### Doc Links

- applications crate: https://crates.io/crates/applications
- applications docs: https://docs.rs/applications
- app-finder crate: https://crates.io/crates/appfinder
- installed crate: https://crates.io/crates/installed

### Notes

- No single crate has perfect cross-platform support with all metadata.
- On macOS, enumerating `/Applications` and `~/Applications` is straightforward. Bundle IDs can be read from each app's `Info.plist`.
- On Windows, querying the registry at `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` gives installed programs.
- This is a bonus feature for Loqui (app-specific transcription profiles), so partial support is acceptable.

---

## 5. Floating Widget (Always-on-top Window)

**Verdict**: Full support

### How

Tauri 2's `WebviewWindowBuilder` (Rust) and window configuration (JSON) support all the properties needed for a floating widget:

| Property                    | API                            | Support     |
|-----------------------------|--------------------------------|-------------|
| Always-on-top               | `.always_on_top(true)`         | All desktop |
| Frameless (no title bar)    | `.decorations(false)`          | All desktop |
| Transparent background      | `.transparent(true)`           | All desktop |
| Visible on all Spaces       | `.visible_on_all_workspaces(true)` | macOS only  |
| Click-through               | `window.set_ignore_cursor_events(true)` | All desktop (see notes) |
| Draggable                   | `data-tauri-drag-region` attribute or `window.start_dragging()` | All desktop |
| Custom size                 | `.inner_size(width, height)`   | All desktop |
| Position                    | `.position(x, y)`             | All desktop |
| Skip taskbar                | `.skip_taskbar(true)`          | All desktop |

### Code Example (Rust -- creating the widget window)

```rust
use tauri::WebviewWindowBuilder;
use tauri::WebviewUrl;

fn create_widget_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let widget = WebviewWindowBuilder::new(
        app,
        "widget",                                 // unique label
        WebviewUrl::App("widget.html".into()),    // separate HTML for widget
    )
    .title("Loqui Widget")
    .inner_size(80.0, 80.0)                       // small floating circle
    .decorations(false)                           // no title bar
    .transparent(true)                            // transparent background
    .always_on_top(true)                          // float above everything
    .skip_taskbar(true)                           // don't show in taskbar/dock
    .visible_on_all_workspaces(true)              // visible on all macOS Spaces
    .resizable(false)                             // fixed size
    .build()?;

    Ok(())
}
```

### Code Example (tauri.conf.json -- declarative)

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Loqui",
        "width": 800,
        "height": 600
      },
      {
        "label": "widget",
        "url": "widget.html",
        "title": "Loqui Widget",
        "width": 80,
        "height": 80,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visibleOnAllWorkspaces": true,
        "resizable": false
      }
    ]
  }
}
```

### Code Example (HTML/CSS -- widget content with drag region)

```html
<!-- widget.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      background: transparent;
      overflow: hidden;
    }
    .widget {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(30, 30, 30, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      /* Enable dragging */
    }
    .widget.recording {
      background: rgba(220, 38, 38, 0.9);
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  </style>
</head>
<body>
  <!-- data-tauri-drag-region enables native window dragging -->
  <div class="widget" data-tauri-drag-region>
    <span id="mic-icon">🎙</span>
  </div>
  <script type="module" src="widget.js"></script>
</body>
</html>
```

### Click-through + Toggle

```javascript
// widget.js
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

// Toggle click-through mode (e.g., while NOT recording)
async function setClickThrough(enabled) {
  await appWindow.setIgnoreCursorEvents(enabled);
}

// When idle: click-through so user can interact with apps behind
setClickThrough(true);

// When recording: disable click-through so user can interact with widget
setClickThrough(false);
```

### Doc Links

- Window customization guide: https://v2.tauri.app/learn/window-customization/
- WebviewWindowBuilder API: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html
- Window JS API: https://v2.tauri.app/reference/javascript/api/namespacewindow/
- Tauri configuration reference: https://v2.tauri.app/reference/config/

### Notes

- **`visible_on_all_workspaces`**: Works on macOS Spaces. Not supported on Windows (Windows does not have the same virtual desktop concept at the API level) or iOS/Android.
- **`set_ignore_cursor_events`**: There is a known bug on Windows 10 (#11461) where click-through does not work correctly in some configurations. macOS works reliably.
- **Transparency**: On Linux, transparency requires a compositor (e.g., picom, built-in on GNOME/KDE). Wayland compositors generally support it.
- **Dragging limitation**: The window must be focused to initiate dragging via `data-tauri-drag-region`. For an always-click-through widget, you need to toggle `setIgnoreCursorEvents(false)` first.

---

## 6. Multi-window + System Tray

**Verdict**: Full support

### How

Tauri 2 has first-class support for:
- **Multiple windows**: Each with its own label, URL, and configuration
- **System tray**: Via `TrayIconBuilder` with menus, click handlers, and dynamic icon switching
- **Inter-window communication**: Via Tauri events (`app.emit()` / `window.emit()`)

### Code Example (Complete setup: main window + widget + tray)

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    WebviewUrl, WebviewWindowBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // --- Main Window ---
            // (created automatically from tauri.conf.json, or manually:)
            let _main_window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Loqui")
            .inner_size(800.0, 600.0)
            .build()?;

            // --- Widget Window ---
            let _widget = WebviewWindowBuilder::new(
                app,
                "widget",
                WebviewUrl::App("widget.html".into()),
            )
            .inner_size(80.0, 80.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .build()?;

            // --- System Tray ---
            let quit = MenuItem::with_id(app, "quit", "Quit Loqui", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide_widget = MenuItem::with_id(
                app, "toggle_widget", "Toggle Widget", true, None::<&str>
            )?;

            let menu = Menu::with_items(app, &[&show, &hide_widget, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(false)  // left click does not show menu
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "toggle_widget" => {
                            if let Some(widget) = app.get_webview_window("widget") {
                                if widget.is_visible().unwrap() {
                                    widget.hide().unwrap();
                                } else {
                                    widget.show().unwrap();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Inter-window Communication

```rust
// Emit from Rust to a specific window
app.get_webview_window("widget")
    .unwrap()
    .emit("transcription-result", "Hello world")?;

// Emit to ALL windows
app.emit("recording-state", "started")?;
```

```javascript
// Listen in any window (JS side)
import { listen } from '@tauri-apps/api/event';

await listen('transcription-result', (event) => {
  console.log('Transcription:', event.payload);
  document.getElementById('result').innerText = event.payload;
});
```

### Doc Links

- System tray guide: https://v2.tauri.app/learn/system-tray/
- TrayIconBuilder API: https://docs.rs/tauri/2.0.0/tauri/tray/struct.TrayIconBuilder.html
- Multi-window guide: https://tauritutorials.com/blog/creating-windows-in-tauri
- Events documentation: https://v2.tauri.app/develop/inter-process-communication/

### Notes

- Each window must have a **unique label**.
- On Linux, the tray icon may not be visible unless a menu is set. Setting an empty menu is sufficient.
- The tray icon supports dynamic updates (change icon, tooltip, menu items at runtime).
- **Windows**: System tray icons appear in the notification area. Right-click shows the context menu by default.
- **macOS**: Tray icons appear in the menu bar. The `menu_on_left_click(false)` option is useful so left-click can trigger a custom action (e.g., toggle widget visibility).

---

## 7. Clipboard Injection (Paste Simulation)

**Verdict**: Full support

### How

This requires two steps:
1. **Write to clipboard**: Use the official **`tauri-plugin-clipboard-manager`** or the `arboard` Rust crate
2. **Simulate Cmd+V / Ctrl+V**: Use the **`enigo`** Rust crate for cross-platform key simulation

| Component       | Crate / Plugin                         | Platforms           |
|-----------------|----------------------------------------|---------------------|
| Clipboard write | `tauri-plugin-clipboard-manager` (official) | macOS, Windows, Linux |
| Clipboard write | `arboard` (standalone Rust)            | macOS, Windows, Linux |
| Key simulation  | `enigo` (v0.3+)                        | macOS, Windows, Linux |
| Key simulation  | `rdev` (alternative)                   | macOS, Windows, Linux |

### Code Example

```rust
// Cargo.toml
// [dependencies]
// enigo = "0.3"
// arboard = "3"
// tauri-plugin-clipboard-manager = "2"

use arboard::Clipboard;
use enigo::{Enigo, Keyboard, Settings, Key, Direction};
use std::thread;
use std::time::Duration;

#[tauri::command]
fn paste_text(text: String) -> Result<(), String> {
    // Step 1: Write text to clipboard
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(&text).map_err(|e| e.to_string())?;

    // Step 2: Small delay to ensure clipboard is updated
    thread::sleep(Duration::from_millis(50));

    // Step 3: Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux)
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Direction::Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
        enigo.key(Key::Meta, Direction::Release).map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
        enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

### Workflow for Loqui

```
User holds hotkey -> Recording starts -> User releases hotkey ->
Whisper transcribes audio -> Text written to clipboard ->
Focus returns to previous app -> Cmd+V simulated -> Text appears in active app
```

### Doc Links

- tauri-plugin-clipboard-manager: https://v2.tauri.app/plugin/clipboard/
- arboard crate: https://crates.io/crates/arboard
- enigo crate: https://crates.io/crates/enigo
- enigo GitHub: https://github.com/enigo-rs/enigo
- enigo docs: https://docs.rs/enigo/latest/enigo/

### Notes

- **macOS Accessibility**: `enigo` requires **Accessibility permission** on macOS to simulate key events. The app must be added to System Preferences > Privacy & Security > Accessibility. Use `tauri-plugin-macos-permissions` to check/prompt for this.
- **Timing**: A small delay (50-100ms) between clipboard write and key simulation is important. Some applications need time to register the clipboard change.
- **Alternative approach**: Instead of simulating paste, some apps support direct text insertion via accessibility APIs (macOS `AXUIElement`). This is more reliable but significantly more complex.
- **Security**: The Tauri 2 permission system requires explicit `clipboard-manager:allow-write-text` capability.
- **Preserving original clipboard**: For a polished experience, save the original clipboard contents, write the transcribed text, simulate paste, then restore the original clipboard after a short delay.

---

## 8. Whisper Local Inference

**Verdict**: Full support

### How

The **`whisper-rs`** crate provides Rust bindings to **whisper.cpp**, enabling local on-device speech-to-text with no network dependency. It supports hardware acceleration on all major platforms.

| Feature             | Support                                |
|---------------------|----------------------------------------|
| CPU inference       | All platforms                          |
| CoreML (ANE)        | macOS Apple Silicon (`coreml` feature) |
| Metal (GPU)         | macOS (`metal` feature)                |
| CUDA (GPU)          | NVIDIA GPUs (`cuda` feature)           |
| Vulkan (GPU)        | Cross-platform (`vulkan` feature)      |
| OpenBLAS            | CPU acceleration (`openblas` feature)  |
| Model formats       | GGML quantized models (tiny to large)  |
| Input format        | 16kHz mono f32 PCM                     |

### Cargo.toml Configuration

```toml
[dependencies]
whisper-rs = { version = "0.15", features = ["coreml", "metal"] }

# Or for cross-platform without Apple-specific features:
# whisper-rs = "0.15"
```

### Code Example

```rust
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[tauri::command]
fn transcribe_audio(audio_data: Vec<f32>) -> Result<String, String> {
    // Load model (do this once at app startup, not per-transcription)
    let ctx = WhisperContext::new_with_params(
        "models/ggml-base.en.bin",  // path to GGML model
        WhisperContextParameters::default(),
    )
    .map_err(|e| format!("Failed to load model: {}", e))?;

    let mut state = ctx.create_state()
        .map_err(|e| format!("Failed to create state: {}", e))?;

    // Configure transcription parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(true);   // for short recordings
    params.set_no_context(true);       // don't use context from previous runs

    // Run inference -- audio_data must be 16kHz mono f32 PCM
    state.full(params, &audio_data)
        .map_err(|e| format!("Transcription failed: {}", e))?;

    // Collect results
    let num_segments = state.full_n_segments()
        .map_err(|e| format!("Failed to get segments: {}", e))?;

    let mut result = String::new();
    for i in 0..num_segments {
        if let Ok(segment) = state.full_get_segment_text(i) {
            result.push_str(&segment);
        }
    }

    Ok(result.trim().to_string())
}
```

### Recommended Architecture for Loqui

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

struct WhisperState {
    ctx: Arc<Mutex<WhisperContext>>,
}

// Initialize once at startup
fn init_whisper(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let model_path = app
        .path()
        .app_data_dir()?
        .join("models")
        .join("ggml-base.en.bin");

    let ctx = WhisperContext::new_with_params(
        model_path.to_str().unwrap(),
        WhisperContextParameters::default(),
    )?;

    app.manage(WhisperState {
        ctx: Arc::new(Mutex::new(ctx)),
    });

    Ok(())
}

// Use in commands
#[tauri::command]
async fn transcribe(
    audio: Vec<f32>,
    whisper: tauri::State<'_, WhisperState>,
) -> Result<String, String> {
    let ctx = whisper.ctx.lock().await;
    // ... transcription logic
    Ok("transcribed text".to_string())
}
```

### Performance Benchmarks (approximate)

| Model       | Size   | Apple M1 (CoreML) | Apple M1 (CPU) | x86 CPU (8-core) |
|-------------|--------|--------------------|-----------------|--------------------|
| tiny.en     | 75 MB  | ~0.3s / 10s audio  | ~1s / 10s audio | ~2s / 10s audio    |
| base.en     | 142 MB | ~0.5s / 10s audio  | ~2s / 10s audio | ~4s / 10s audio    |
| small.en    | 466 MB | ~1.5s / 10s audio  | ~6s / 10s audio | ~10s / 10s audio   |

*CoreML provides roughly 3x speedup over CPU-only on Apple Silicon.*

### Doc Links

- whisper-rs crate: https://crates.io/crates/whisper-rs
- whisper-rs GitHub: https://github.com/tazz4843/whisper-rs
- whisper-rs docs: https://docs.rs/whisper-rs
- whisper.cpp (upstream): https://github.com/ggml-org/whisper.cpp
- GGML models: https://huggingface.co/ggerganov/whisper.cpp
- Alternative: whisper-cpp-plus (streaming + VAD): https://crates.io/crates/whisper-cpp-plus

### Notes

- **CoreML models**: For CoreML acceleration, you need both the GGML model AND a CoreML-converted model. The conversion uses Python's `coremltools`. Pre-converted models are available on HuggingFace.
- **First-run model download**: Loqui should bundle the tiny/base model (~75-142 MB) or download it on first launch to the app data directory.
- **Thread safety**: `WhisperContext` is not `Send`/`Sync` by default. Wrap it in `Arc<Mutex<>>` for use across async Tauri commands.
- **Streaming**: For real-time transcription (showing partial results while recording), use `whisper-cpp-plus` which has a streaming API, or implement a chunked approach with `whisper-rs`.
- **Bundle size impact**: The whisper.cpp static library adds ~5-10 MB to the binary. Models are separate files.

---

## 9. Cross-Platform Support

**Verdict**: Full support (with per-platform caveats)

### Platform Matrix

| Feature                       | macOS | Windows | Linux |
|-------------------------------|-------|---------|-------|
| Microphone (cpal)             | Yes (CoreAudio) | Yes (WASAPI) | Yes (ALSA) |
| Global hotkey                 | Yes   | Yes     | Yes (X11; Wayland limited) |
| Active window detection       | Yes   | Yes     | Yes (X11; GNOME needs extension) |
| Always-on-top window          | Yes   | Yes     | Yes   |
| Visible on all workspaces     | Yes   | No (N/A)| Varies |
| Transparent window            | Yes   | Yes     | Yes (needs compositor) |
| Click-through                 | Yes   | Partial (bugs) | Yes |
| System tray                   | Yes   | Yes     | Yes (needs menu) |
| Clipboard write               | Yes   | Yes     | Yes   |
| Key simulation (enigo)        | Yes (needs Accessibility) | Yes | Yes (X11) |
| Whisper CoreML                | Yes (Apple Silicon) | N/A | N/A |
| Whisper Metal                 | Yes   | N/A     | N/A   |
| Whisper CUDA                  | N/A   | Yes (NVIDIA) | Yes (NVIDIA) |
| Whisper Vulkan                | Yes   | Yes     | Yes   |
| Whisper CPU                   | Yes   | Yes     | Yes   |

### Bundle Size Advantage

| Metric        | Tauri 2         | Electron        |
|---------------|-----------------|-----------------|
| Binary size   | 3-15 MB         | 80-120 MB       |
| RAM (idle)    | 30-50 MB        | 200-300 MB      |
| Startup time  | 0.5-1s          | 2-4s            |
| WebView       | Native OS (WebKit/WebView2/WebKitGTK) | Bundled Chromium |

For Loqui, the Tauri binary (excluding the Whisper model) would be approximately **10-15 MB** (including whisper.cpp static lib). With a tiny.en model bundled, the total installer would be **~85-90 MB**. An equivalent Electron app would be **~200+ MB**.

### Platform-Specific Permissions Required

**macOS:**
- Microphone access (`NSMicrophoneUsageDescription` in Info.plist)
- Accessibility permission (for `enigo` key simulation)
- Screen Recording permission (only if you need window titles from `active-win-pos-rs`)

**Windows:**
- No special permissions needed for most features
- Microphone access prompt handled by Windows natively

**Linux:**
- ALSA/PulseAudio for audio
- X11 for global hotkeys and window detection (Wayland limitations)

### Doc Links

- Tauri 2 prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri vs Electron deep-dive: https://www.gethopp.app/blog/tauri-vs-electron
- Tauri v2 vs Electron comparison: https://www.oflight.co.jp/en/columns/tauri-v2-vs-electron-comparison

---

## 10. Mobile Support

**Verdict**: Partial support (not recommended for Loqui v1)

### Status

Tauri 2 officially supports iOS and Android as of the stable release (October 2024). However, the mobile support is still maturing.

### What Works on Mobile

| Feature                      | iOS | Android | Notes                                |
|------------------------------|-----|---------|--------------------------------------|
| WebView UI                   | Yes | Yes     | WKWebView / Android WebView          |
| Shared frontend code         | Yes | Yes     | Same HTML/CSS/JS                     |
| Shared Rust commands         | Yes | Yes     | Same `#[tauri::command]` functions    |
| Microphone (plugin)          | Yes | Yes     | Via `tauri-plugin-mic-recorder` (M4A output) |
| Clipboard                    | Yes | Yes     | Official plugin works                |
| Notifications                | Yes | Yes     | Official plugin                      |
| Deep links                   | Yes | Yes     | Official plugin                      |
| Biometric auth               | Yes | Yes     | Official plugin                      |
| Hot Module Replacement       | Yes | Yes     | Live preview on device/emulator      |

### What Does NOT Work on Mobile

| Feature                      | Status | Reason                               |
|------------------------------|--------|--------------------------------------|
| Global hotkeys               | N/A    | No concept of system-wide hotkeys    |
| Active window detection      | N/A    | Sandboxed; can't inspect other apps  |
| Always-on-top widget         | N/A    | Requires overlay permissions, complex|
| Multi-window                 | N/A    | Not supported                        |
| System tray                  | N/A    | Mobile OS concept doesn't exist      |
| Key simulation (enigo)       | N/A    | Sandboxed; can't inject input        |
| Whisper.cpp native           | Partial| Possible but complex build setup     |
| `cpal` audio capture         | No     | cpal does not support mobile          |

### Code Sharing Architecture

```
src-tauri/
  src/
    lib.rs          # Shared Rust logic (transcription, settings)
    commands.rs     # Shared Tauri commands
    desktop.rs      # Desktop-specific (hotkeys, window detection, enigo)
    mobile.rs       # Mobile-specific (native mic plugin)
  Cargo.toml

src/                # Shared frontend (HTML/CSS/JS/React/Vue)
  App.tsx
  components/
    TranscriptionView.tsx   # Shared
    DesktopWidget.tsx        # Desktop only
    MobileRecordButton.tsx   # Mobile only
```

### Doc Links

- Tauri 2 mobile development: https://v2.tauri.app/develop/
- Mobile plugin development: https://v2.tauri.app/develop/plugins/develop-mobile/
- Mobile prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri 2.0 announcement (mobile section): https://v2.tauri.app/blog/tauri-20/

### Notes

- The Tauri team explicitly states they "don't want to raise expectations that Tauri 2.0 will be the 'mobile as a first class citizen' release."
- Developer experience for mobile is actively being improved but is not yet on par with desktop.
- For Loqui, a **mobile companion app** is feasible for basic recording + transcription, but the core desktop features (floating widget, global hotkeys, paste injection) have no mobile equivalent.
- **Recommendation**: Build desktop first, then evaluate mobile as a v2 feature with a simplified "record and transcribe" UI.

---

## 11. Overall Assessment

### Suitability Score: 9 / 10

### Summary Table

| # | Requirement                  | Verdict      | Confidence |
|---|------------------------------|--------------|------------|
| 1 | Microphone capture (16kHz)   | Full support | High       |
| 2 | Global hotkey (press/release)| Full support | High       |
| 3 | Active app detection         | Full support | High       |
| 4 | List installed apps          | Partial      | Medium     |
| 5 | Floating widget              | Full support | High       |
| 6 | Multi-window + tray          | Full support | High       |
| 7 | Clipboard + paste simulation | Full support | High       |
| 8 | Whisper local inference      | Full support | High       |
| 9 | Cross-platform               | Full support | High       |
| 10| Mobile support               | Partial      | Low        |

### Why 9/10

**Strengths:**
- Every core Loqui desktop feature is fully achievable with Tauri 2
- The Rust backend is ideal for Whisper integration -- native performance, no bridging overhead
- Massively smaller bundle size and RAM usage compared to Electron
- Global hotkey plugin supports press/release events natively -- perfect for hold-to-record
- The plugin ecosystem is mature and actively maintained
- Multi-window, system tray, and transparent widgets are all first-class features
- CoreML acceleration on Apple Silicon gives near-instant transcription

**What prevents a perfect 10:**
- Mobile support is immature and most Loqui features don't translate to mobile
- Some features have platform-specific bugs (click-through on Windows, Wayland limitations)
- `enigo` key simulation requires Accessibility permission on macOS (user friction)
- No built-in audio resampling -- must handle 48kHz-to-16kHz conversion manually
- Listing installed applications lacks a single robust cross-platform solution

### Recommended Tech Stack

```
Framework:     Tauri 2.x
Frontend:      React/Vue/Svelte + TypeScript
Audio:         cpal (capture) + rubato (resample)
Transcription: whisper-rs (with coreml+metal features on macOS)
Global hotkey: tauri-plugin-global-shortcut
Clipboard:     tauri-plugin-clipboard-manager + arboard
Paste:         enigo
Window detect: active-win-pos-rs
Permissions:   tauri-plugin-macos-permissions
System tray:   Built-in TrayIconBuilder
```

### Key Risks and Mitigations

| Risk                                        | Mitigation                                                |
|---------------------------------------------|-----------------------------------------------------------|
| macOS Accessibility permission for enigo     | Clear onboarding flow guiding user to grant permission    |
| Wayland limitations on Linux                 | Target X11 initially; Wayland support improving upstream  |
| Audio resampling needed                      | Use `rubato` crate; well-documented, performant           |
| Whisper model download size                  | Bundle tiny.en (~75MB); offer base/small as optional downloads |
| Click-through bugs on Windows                | Test thoroughly; provide fallback UI mode                  |
| CoreML model conversion complexity           | Pre-convert and host models; download on first launch     |

---

*This research was conducted on 2026-03-12. Crate versions and API details may change. Always verify against the latest documentation.*
