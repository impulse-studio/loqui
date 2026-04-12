use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

/// Lists all available audio input devices.
pub fn list_input_devices() -> Result<Vec<AudioDevice>, AppError> {
    let host = cpal::default_host();

    let default_name = host
        .default_input_device()
        .and_then(|d| d.name().ok());

    let devices = host
        .input_devices()
        .map_err(|e| AppError::Audio(format!("failed to enumerate input devices: {e}")))?;

    let mut result = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            let is_default = default_name.as_deref() == Some(&name);
            result.push(AudioDevice { name, is_default });
        }
    }

    Ok(result)
}

/// Finds an input device by name, falling back to the default device.
pub fn find_device_by_name(name: &str) -> Result<cpal::Device, AppError> {
    let host = cpal::default_host();

    if name.is_empty() || name == "default" {
        return host
            .default_input_device()
            .ok_or_else(|| AppError::Audio("no input device available".to_string()));
    }

    let devices = host
        .input_devices()
        .map_err(|e| AppError::Audio(format!("failed to enumerate input devices: {e}")))?;

    let normalized = name.trim().to_lowercase();
    for device in devices {
        if let Some(dev_name) = device.name().ok() {
            if dev_name.trim().to_lowercase() == normalized {
                return Ok(device);
            }
        }
    }

    // Fallback to default
    host.default_input_device()
        .ok_or_else(|| AppError::Audio("no input device available".to_string()))
}
