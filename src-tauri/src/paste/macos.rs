use crate::error::AppError;
use std::os::raw::c_void;

type CGEventRef = *mut c_void;
type CGEventSourceRef = *mut c_void;

/// Virtual keycode for 'V'
const K_VK_V: u16 = 9;

/// CGEventSourceStateID::HIDSystemState
const K_CG_EVENT_SOURCE_STATE_HID: i32 = 1;

/// CGEventFlags for Command key
const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 1 << 20;

extern "C" {
    fn CGEventSourceCreate(state_id: i32) -> CGEventSourceRef;
    fn CGEventCreateKeyboardEvent(
        source: CGEventSourceRef,
        virtual_key: u16,
        key_down: bool,
    ) -> CGEventRef;
    fn CGEventSetFlags(event: CGEventRef, flags: u64);
    fn CGEventPost(tap: u32, event: CGEventRef);
    fn CFRelease(cf: *mut c_void);
}

/// Simulate Cmd+V on macOS using CoreGraphics events.
pub fn simulate_paste() -> Result<(), AppError> {
    unsafe {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID);
        if source.is_null() {
            return Err(AppError::Hotkey("Failed to create CGEventSource".to_string()));
        }

        // Key down: V with Cmd flag
        let key_down = CGEventCreateKeyboardEvent(source, K_VK_V, true);
        if !key_down.is_null() {
            CGEventSetFlags(key_down, K_CG_EVENT_FLAG_MASK_COMMAND);
            CGEventPost(0, key_down); // 0 = kCGHIDEventTap
            CFRelease(key_down);
        }

        // Small delay between down and up
        std::thread::sleep(std::time::Duration::from_millis(10));

        // Key up: V with Cmd flag
        let key_up = CGEventCreateKeyboardEvent(source, K_VK_V, false);
        if !key_up.is_null() {
            CGEventSetFlags(key_up, K_CG_EVENT_FLAG_MASK_COMMAND);
            CGEventPost(0, key_up);
            CFRelease(key_up);
        }

        CFRelease(source);
    }

    Ok(())
}
