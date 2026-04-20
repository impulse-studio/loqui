//! Single entry point that routes a transcription request to either the
//! bundled local Whisper engine or a remote provider based on the
//! `sttProvider` config key.

use crate::error::AppError;
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use crate::stt::{remote, types::TranscriptionResult, whisper::WhisperEngine};

pub struct CloudConfig {
    pub provider: String,
    pub model: String,
    pub custom_endpoint: Option<String>,
    pub api_key: String,
}

/// Read the STT-related config for cloud dispatch.
/// Returns `Ok(None)` when the user is on the local provider.
pub fn load_cloud_config(state: &AppState) -> Result<Option<CloudConfig>, AppError> {
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    let provider = db
        .get_config("sttProvider")
        .ok()
        .flatten()
        .unwrap_or_else(|| "local".to_string());
    let model = db
        .get_config("sttRemoteModel")
        .ok()
        .flatten()
        .unwrap_or_default();
    let custom_endpoint = db.get_config("sttCustomEndpoint").ok().flatten();

    if provider == "local" || provider.is_empty() {
        return Ok(None);
    }

    let api_key = remote::load_api_key(&db, &provider)?.unwrap_or_default();

    Ok(Some(CloudConfig {
        provider,
        model,
        custom_endpoint,
        api_key,
    }))
}

/// Transcribe using the bundled whisper engine.
/// Returns an error if no model is loaded.
pub fn transcribe_local(
    state: &AppState,
    samples: &[f32],
    language: Option<&str>,
) -> Result<TranscriptionResult, AppError> {
    let guard = state.whisper.lock().map_err(|_| AppError::LockPoisoned)?;
    let engine: &WhisperEngine = guard
        .as_ref()
        .ok_or_else(|| AppError::Stt("local STT model not loaded".to_string()))?;
    engine.transcribe(samples, language)
}

fn read_stt_language(state: &AppState) -> Option<String> {
    let db = state.db.lock().ok()?;
    db.get_config("sttLanguage").ok().flatten()
}

/// Route transcription based on the current config.
pub async fn transcribe(
    state: &AppState,
    samples: &[f32],
    language_override: Option<&str>,
) -> Result<TranscriptionResult, AppError> {
    let cloud = load_cloud_config(state)?;
    let resolved_lang = language_override
        .map(str::to_string)
        .or_else(|| read_stt_language(state))
        .filter(|l| l != "auto");

    match cloud {
        None => transcribe_local(state, samples, resolved_lang.as_deref()),
        Some(cfg) => {
            remote::transcribe_remote(
                &cfg.provider,
                &cfg.api_key,
                &cfg.model,
                cfg.custom_endpoint.as_deref(),
                samples,
                resolved_lang.as_deref(),
            )
            .await
        }
    }
}
