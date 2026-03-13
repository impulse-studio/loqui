use crate::error::AppError;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Runtime};

use super::dsp;
use super::types::AudioBuffer;

/// Thread-safe handle to an active recording session.
/// The cpal Stream lives on a dedicated thread; this handle is Send + Sync.
pub struct AudioCapture {
    samples: Arc<Mutex<Vec<f32>>>,
    stop_flag: Arc<AtomicBool>,
    device_sample_rate: u32,
    device_channels: u16,
}

impl AudioCapture {
    pub fn start<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Self, AppError> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| AppError::Audio("no input device available".to_string()))?;

        let config = device
            .default_input_config()
            .map_err(|e| AppError::Audio(format!("failed to get input config: {e}")))?;

        let device_sample_rate = config.sample_rate().0;
        let device_channels = config.channels();

        let samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let stop_flag = Arc::new(AtomicBool::new(false));

        let samples_clone = samples.clone();
        let app_handle_clone = app_handle.clone();
        let stop_clone = stop_flag.clone();

        let stream_config = config.config();
        let sample_format = config.sample_format();

        // Spawn a dedicated thread that owns the cpal Stream
        std::thread::spawn(move || {
            let err_fn = |err| {
                log::error!("audio stream error: {err}");
            };

            let stream_result = match sample_format {
                SampleFormat::F32 => device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        process_samples(data, device_channels, &samples_clone, &app_handle_clone);
                    },
                    err_fn,
                    None,
                ),
                SampleFormat::I16 => {
                    device.build_input_stream(
                        &stream_config,
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let float_data: Vec<f32> = data
                                .iter()
                                .map(|&s| f32::from(s) / f32::from(i16::MAX))
                                .collect();
                            process_samples(
                                &float_data,
                                device_channels,
                                &samples_clone,
                                &app_handle_clone,
                            );
                        },
                        err_fn,
                        None,
                    )
                }
                _ => {
                    log::error!("unsupported sample format: {sample_format:?}");
                    return;
                }
            };

            let stream = match stream_result {
                Ok(s) => s,
                Err(e) => {
                    log::error!("failed to build audio stream: {e}");
                    return;
                }
            };

            if let Err(e) = stream.play() {
                log::error!("failed to start audio stream: {e}");
                return;
            }

            // Block until stop_flag is set
            while !stop_clone.load(Ordering::Relaxed) {
                std::thread::sleep(std::time::Duration::from_millis(50));
            }

            // Stream is dropped here, stopping the recording
        });

        Ok(Self {
            samples,
            stop_flag,
            device_sample_rate,
            device_channels,
        })
    }

    pub fn stop(&mut self) -> Result<AudioBuffer, AppError> {
        self.stop_flag.store(true, Ordering::Relaxed);

        // Give the thread a moment to stop
        std::thread::sleep(std::time::Duration::from_millis(100));

        let raw_samples = {
            let guard = self.samples.lock().map_err(|_| AppError::LockPoisoned)?;
            guard.clone()
        };

        let mono_samples = if self.device_channels > 1 {
            dsp::to_mono(&raw_samples, self.device_channels)
        } else {
            raw_samples
        };

        let resampled = if self.device_sample_rate == 16000 {
            mono_samples
        } else {
            dsp::resample(&mono_samples, self.device_sample_rate, 16000)
        };

        Ok(AudioBuffer {
            samples: resampled,
            sample_rate: 16000,
            channels: 1,
        })
    }
}

fn process_samples<R: Runtime>(
    data: &[f32],
    _channels: u16,
    samples: &Arc<Mutex<Vec<f32>>>,
    app_handle: &AppHandle<R>,
) {
    if let Ok(mut buf) = samples.lock() {
        buf.extend_from_slice(data);
    }

    if !data.is_empty() {
        let sum: f32 = data.iter().map(|s| s * s).sum();
        #[allow(clippy::cast_precision_loss)]
        let rms = (sum / data.len() as f32).sqrt();
        let level = (rms * 10.0).min(1.0);
        let _ = app_handle.emit("audio-level", serde_json::json!({ "level": level }));
    }
}

