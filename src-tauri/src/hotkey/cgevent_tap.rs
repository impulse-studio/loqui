//! Low-level macOS CGEventTap wrapper for global keyboard monitoring.
//!
//! Spawns a dedicated thread with its own CFRunLoop that receives all
//! keyboard events (key down, key up, flags changed) and forwards them
//! through an `mpsc` channel as [`RawKeyEvent`] values.

use std::os::raw::c_void;
use std::sync::mpsc;

// ---------------------------------------------------------------------------
// CoreGraphics / CoreFoundation FFI
// ---------------------------------------------------------------------------

type CFMachPortRef = *mut c_void;
type CFRunLoopSourceRef = *mut c_void;
type CFRunLoopRef = *mut c_void;
type CGEventRef = *mut c_void;
type CFAllocatorRef = *const c_void;
type CFStringRef = *const c_void;

// CGEventTapLocation
const K_CG_SESSION_EVENT_TAP: u32 = 1;
// CGEventTapPlacement
const K_CG_HEAD_INSERT_EVENT_TAP: u32 = 0;
// CGEventTapOptions
const K_CG_EVENT_TAP_OPTION_LISTEN_ONLY: u32 = 1;

// CGEvent type constants
const CG_EVENT_KEY_DOWN: u32 = 10;
const CG_EVENT_KEY_UP: u32 = 11;
const CG_EVENT_FLAGS_CHANGED: u32 = 12;

// CGEvent masks
const K_CG_EVENT_KEY_DOWN_MASK: u64 = 1 << 10;
const K_CG_EVENT_KEY_UP_MASK: u64 = 1 << 11;
const K_CG_EVENT_FLAGS_CHANGED_MASK: u64 = 1 << 12;

// CGEventField for keyboard keycode
const K_CG_KEYBOARD_EVENT_KEYCODE: u32 = 9;

// Device-level modifier masks (separate left / right)
const NX_DEVICELCTLKEYMASK: u64 = 0x0000_0001;
const NX_DEVICELSHIFTKEYMASK: u64 = 0x0000_0002;
const NX_DEVICERSHIFTKEYMASK: u64 = 0x0000_0004;
const NX_DEVICELCMDKEYMASK: u64 = 0x0000_0008;
const NX_DEVICERCMDKEYMASK: u64 = 0x0000_0010;
const NX_DEVICELALTKEYMASK: u64 = 0x0000_0020;
const NX_DEVICERALTKEYMASK: u64 = 0x0000_0040;
const NX_DEVICERCTLKEYMASK: u64 = 0x0000_2000;

// Caps Lock and Fn aggregate masks
const NX_ALPHASHIFTMASK: u64 = 1 << 16;
const NX_SECONDARYFNMASK: u64 = 1 << 23;

type CGEventTapCallBack = extern "C" fn(
    proxy: *mut c_void,
    event_type: u32,
    event: CGEventRef,
    user_info: *mut c_void,
) -> CGEventRef;

extern "C" {
    fn CGEventTapCreate(
        tap: u32,
        place: u32,
        options: u32,
        events_of_interest: u64,
        callback: CGEventTapCallBack,
        user_info: *mut c_void,
    ) -> CFMachPortRef;

    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
    fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;
    fn CGEventGetFlags(event: CGEventRef) -> u64;
}

extern "C" {
    static kCFAllocatorDefault: CFAllocatorRef;
    static kCFRunLoopDefaultMode: CFStringRef;

    fn CFMachPortCreateRunLoopSource(
        allocator: CFAllocatorRef,
        port: CFMachPortRef,
        order: i64,
    ) -> CFRunLoopSourceRef;

    fn CFRunLoopGetCurrent() -> CFRunLoopRef;
    fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: CFStringRef);
    fn CFRunLoopRun();
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct RawKeyEvent {
    pub key_code: u16,
    pub pressed: bool,
}

// ---------------------------------------------------------------------------
// Global callback state (CGEventTap callbacks cannot capture)
// ---------------------------------------------------------------------------

use std::sync::OnceLock;

static SENDER: OnceLock<mpsc::Sender<RawKeyEvent>> = OnceLock::new();

extern "C" fn tap_callback(
    _proxy: *mut c_void,
    event_type: u32,
    event: CGEventRef,
    _user_info: *mut c_void,
) -> CGEventRef {
    let Some(sender) = SENDER.get() else {
        return event;
    };

    let kc = unsafe { CGEventGetIntegerValueField(event, K_CG_KEYBOARD_EVENT_KEYCODE) } as u16;

    match event_type {
        CG_EVENT_KEY_DOWN => {
            let _ = sender.send(RawKeyEvent { key_code: kc, pressed: true });
        }
        CG_EVENT_KEY_UP => {
            let _ = sender.send(RawKeyEvent { key_code: kc, pressed: false });
        }
        CG_EVENT_FLAGS_CHANGED => {
            let flags = unsafe { CGEventGetFlags(event) };

            let pressed = match kc {
                56 => flags & NX_DEVICELSHIFTKEYMASK != 0,
                60 => flags & NX_DEVICERSHIFTKEYMASK != 0,
                58 => flags & NX_DEVICELALTKEYMASK != 0,
                61 => flags & NX_DEVICERALTKEYMASK != 0,
                55 => flags & NX_DEVICELCMDKEYMASK != 0,
                54 => flags & NX_DEVICERCMDKEYMASK != 0,
                59 => flags & NX_DEVICELCTLKEYMASK != 0,
                62 => flags & NX_DEVICERCTLKEYMASK != 0,
                57 => flags & NX_ALPHASHIFTMASK != 0,
                63 => flags & NX_SECONDARYFNMASK != 0,
                _ => false,
            };

            let _ = sender.send(RawKeyEvent { key_code: kc, pressed });
        }
        _ => {}
    }
    event
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Start the CGEventTap listener on a dedicated thread.
///
/// Returns a receiver that yields [`RawKeyEvent`] for every keyboard event
/// system-wide. The thread runs until the process exits.
///
/// **Requires Accessibility permissions on macOS.**
pub fn start_listener() -> mpsc::Receiver<RawKeyEvent> {
    let (tx, rx) = mpsc::channel();

    std::thread::spawn(move || {
        let _ = SENDER.set(tx);

        let mask = K_CG_EVENT_KEY_DOWN_MASK | K_CG_EVENT_KEY_UP_MASK | K_CG_EVENT_FLAGS_CHANGED_MASK;

        unsafe {
            let tap = CGEventTapCreate(
                K_CG_SESSION_EVENT_TAP,
                K_CG_HEAD_INSERT_EVENT_TAP,
                K_CG_EVENT_TAP_OPTION_LISTEN_ONLY,
                mask,
                tap_callback,
                std::ptr::null_mut(),
            );

            if tap.is_null() {
                log::error!("Failed to create CGEventTap — check Accessibility permissions");
                return;
            }

            let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0);
            let run_loop = CFRunLoopGetCurrent();
            CFRunLoopAddSource(run_loop, source, kCFRunLoopDefaultMode);
            CGEventTapEnable(tap, true);

            // Blocks forever, processing events on this thread's run loop.
            CFRunLoopRun();
        }
    });

    rx
}
