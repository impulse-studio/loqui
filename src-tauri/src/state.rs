use crate::audio::capture::AudioCapture;
use crate::hotkey::handler::HotkeyTarget;
use crate::stt::whisper::WhisperEngine;
use crate::storage::database::Database;
use std::sync::Mutex;
use std::time::Instant;
use tokio_util::sync::CancellationToken;

/// Context captured at hotkey press, consumed at hotkey release.
pub struct RecordingContext {
    pub app_name: String,
    pub window_title: String,
    pub start_time: Instant,
}

pub struct AppState {
    pub db: Mutex<Database>,
    pub whisper: Mutex<Option<WhisperEngine>>,
    pub loaded_model_id: Mutex<Option<String>>,
    pub audio_capture: Mutex<Option<AudioCapture>>,
    pub download_cancel: Mutex<Option<CancellationToken>>,
    pub hotkey_target: HotkeyTarget,
    pub recording_context: Mutex<Option<RecordingContext>>,
    pub llm: Mutex<Option<crate::llm::engine::LlmEngine>>,
    pub loaded_llm_id: Mutex<Option<String>>,
    pub llm_download_cancel: Mutex<Option<CancellationToken>>,
}
