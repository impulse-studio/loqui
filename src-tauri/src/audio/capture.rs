use crate::error::AppError;
use cpal::traits::{DeviceTrait, StreamTrait};
use cpal::SampleFormat;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Runtime};

use super::devices;
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
    pub fn start<R: Runtime>(
        app_handle: &AppHandle<R>,
        device_name: &str,
    ) -> Result<Self, AppError> {
        let device = devices::find_device_by_name(device_name)?;

        let config = device
            .default_input_config()
            .map_err(|e| AppError::Audio(format!("failed to get input config: {e}")))?;

        let device_sample_rate = config.sample_rate().0;
        let device_channels = config.channels();

        let samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let stop_flag = Arc::new(AtomicBool::new(false));

        let samples_clone = samples.clone();
        let app_handle_clone = app_handle.clone();
        let error_handle = app_handle.clone();
        let stop_clone = stop_flag.clone();
        let level_state: Arc<Mutex<LevelState>> =
            Arc::new(Mutex::new(LevelState { last_emit: Instant::now(), peak_rms: 0.0 }));

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
                    {
                        let level = level_state.clone();
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            process_samples(data, &samples_clone, &app_handle_clone, &level);
                        }
                    },
                    err_fn,
                    None,
                ),
                SampleFormat::I16 => {
                    let level = level_state.clone();
                    device.build_input_stream(
                        &stream_config,
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let float_data: Vec<f32> = data
                                .iter()
                                .map(|&s| f32::from(s) / f32::from(i16::MAX))
                                .collect();
                            process_samples(
                                &float_data,
                                &samples_clone,
                                &app_handle_clone,
                                &level,
                            );
                        },
                        err_fn,
                        None,
                    )
                }
                _ => {
                    let msg = format!("unsupported sample format: {sample_format:?}");
                    log::error!("{msg}");
                    let _ = error_handle.emit("audio-error", serde_json::json!({ "error": msg }));
                    return;
                }
            };

            let stream = match stream_result {
                Ok(s) => s,
                Err(e) => {
                    let msg = format!("failed to build audio stream: {e}");
                    log::error!("{msg}");
                    let _ = error_handle.emit("audio-error", serde_json::json!({ "error": msg }));
                    return;
                }
            };

            if let Err(e) = stream.play() {
                let msg = format!("failed to start audio stream: {e}");
                log::error!("{msg}");
                let _ = error_handle.emit("audio-error", serde_json::json!({ "error": msg }));
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

/// Throttle state for audio level events (~20 fps).
struct LevelState {
    last_emit: Instant,
    peak_rms: f32,
}

const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(50);

fn process_samples<R: Runtime>(
    data: &[f32],
    samples: &Arc<Mutex<Vec<f32>>>,
    app_handle: &AppHandle<R>,
    level_state: &Arc<Mutex<LevelState>>,
) {
    if let Ok(mut buf) = samples.lock() {
        buf.extend_from_slice(data);
    }

    if data.is_empty() {
        return;
    }

    let sum: f32 = data.iter().map(|s| s * s).sum();
    #[allow(clippy::cast_precision_loss)]
    let rms = (sum / data.len() as f32).sqrt();

    if let Ok(mut state) = level_state.lock() {
        // Track peak RMS across chunks
        if rms > state.peak_rms {
            state.peak_rms = rms;
        }

        // Only emit at ~20 fps
        if state.last_emit.elapsed() < LEVEL_EMIT_INTERVAL {
            return;
        }

        let peak = state.peak_rms;
        state.peak_rms = 0.0;
        state.last_emit = Instant::now();

        // Convert to dB scale: -60dB..-20dB → 0.0..1.0
        let db = if peak > 0.0 { 20.0 * peak.log10() } else { -100.0 };
        let level = ((db + 60.0) / 40.0).clamp(0.0, 1.0);
        let _ = app_handle.emit("audio-level", serde_json::json!({
            "level": level,
            "rms": peak,
            "db": db,
            "chunkSize": data.len()
        }));
    }
}

