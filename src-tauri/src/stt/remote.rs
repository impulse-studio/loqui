//! Cloud-based speech-to-text providers.
//!
//! Uploads raw audio samples (16 kHz mono f32) as a WAV payload to a remote
//! transcription endpoint and returns the recognised text. Providers share an
//! OpenAI-compatible `POST /audio/transcriptions` contract except Deepgram,
//! which uses its own REST shape.
//!
//! API keys are always fetched from the encrypted secret store — callers pass
//! them in so the same function can be reused for connection-test commands.

use crate::error::AppError;
use crate::storage::database::Database;
use crate::storage::secrets::SecretStore;
use crate::stt::types::TranscriptionResult;
use std::time::Instant;

/// Secret-store account for a given STT provider (e.g. `"groq"` → `"stt.groq"`).
pub fn secret_account(provider: &str) -> String {
    format!("stt.{provider}")
}

/// Read the API key for an STT provider from the encrypted secret store.
pub fn load_api_key(db: &Database, provider: &str) -> Result<Option<String>, AppError> {
    db.get_api_key(&secret_account(provider))
}

/// Transcribe 16 kHz mono f32 samples via a remote provider.
///
/// `custom_endpoint` is only used when `provider == "custom"` — it must be the
/// base URL of an OpenAI-compatible server (e.g. `https://my-host.tld/v1`).
pub async fn transcribe_remote(
    provider: &str,
    api_key: &str,
    model: &str,
    custom_endpoint: Option<&str>,
    samples: &[f32],
    language: Option<&str>,
) -> Result<TranscriptionResult, AppError> {
    if api_key.trim().is_empty() {
        return Err(AppError::Stt(format!(
            "no API key configured for STT provider '{provider}'"
        )));
    }
    if model.trim().is_empty() {
        return Err(AppError::Stt(format!(
            "no model selected for STT provider '{provider}'"
        )));
    }

    let start = Instant::now();
    let api_key = api_key.trim();
    let wav = encode_wav_16k_mono(samples);

    log::info!(
        "Remote STT: provider={provider}, model={model}, bytes={}",
        wav.len()
    );

    let text = match provider {
        "groq" => call_openai_compatible(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            api_key,
            model,
            &wav,
            language,
        )
        .await?
        .trim()
        .to_string(),
        "openai" => call_openai_compatible(
            "https://api.openai.com/v1/audio/transcriptions",
            api_key,
            model,
            &wav,
            language,
        )
        .await?
        .trim()
        .to_string(),
        "custom" => {
            let base = custom_endpoint
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or_else(|| {
                    AppError::Stt("custom provider requires an endpoint URL".to_string())
                })?;
            let url = build_openai_compat_url(base);
            call_openai_compatible(&url, api_key, model, &wav, language)
                .await?
                .trim()
                .to_string()
        }
        "deepgram" => call_deepgram(api_key, model, &wav, language)
            .await?
            .trim()
            .to_string(),
        other => {
            return Err(AppError::Stt(format!(
                "unknown STT provider: '{other}'"
            )))
        }
    };

    let duration_ms = start.elapsed().as_millis() as u64;
    Ok(TranscriptionResult { text, duration_ms })
}

/// Verify that an API key is accepted by the provider without performing a
/// transcription. Hits the provider's `/models` (or equivalent) endpoint.
pub async fn verify_credentials(
    provider: &str,
    api_key: &str,
    custom_endpoint: Option<&str>,
) -> Result<(), AppError> {
    if api_key.trim().is_empty() {
        return Err(AppError::Stt("no API key provided".to_string()));
    }
    let api_key = api_key.trim();
    let client = reqwest::Client::new();

    let (url, bearer) = match provider {
        "groq" => ("https://api.groq.com/openai/v1/models".to_string(), true),
        "openai" => ("https://api.openai.com/v1/models".to_string(), true),
        "deepgram" => ("https://api.deepgram.com/v1/projects".to_string(), false),
        "custom" => {
            let base = custom_endpoint
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or_else(|| {
                    AppError::Stt("custom provider requires an endpoint URL".to_string())
                })?;
            let trimmed = base.trim_end_matches('/');
            let root = trimmed.strip_suffix("/v1").unwrap_or(trimmed);
            (format!("{root}/v1/models"), true)
        }
        other => {
            return Err(AppError::Stt(format!(
                "unknown STT provider: '{other}'"
            )))
        }
    };

    let req = if bearer {
        client.get(&url).header("Authorization", format!("Bearer {api_key}"))
    } else {
        client.get(&url).header("Authorization", format!("Token {api_key}"))
    };

    let resp = req.send().await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Stt(format!(
            "{provider} credential check failed: {status} {body}"
        )));
    }
    Ok(())
}

fn build_openai_compat_url(base: &str) -> String {
    let trimmed = base.trim_end_matches('/');
    if trimmed.ends_with("/audio/transcriptions") {
        return trimmed.to_string();
    }
    if trimmed.ends_with("/v1") {
        return format!("{trimmed}/audio/transcriptions");
    }
    format!("{trimmed}/v1/audio/transcriptions")
}

async fn call_openai_compatible(
    url: &str,
    api_key: &str,
    model: &str,
    wav: &[u8],
    language: Option<&str>,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();
    let part = reqwest::multipart::Part::bytes(wav.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| AppError::Stt(format!("multipart build failed: {e}")))?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text("response_format", "json")
        .part("file", part);
    if let Some(lang) = language {
        form = form.text("language", lang.to_string());
    }

    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {api_key}"))
        .multipart(form)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Stt(format!("remote STT {status}: {body}")));
    }

    let json: serde_json::Value = resp.json().await?;
    json["text"]
        .as_str()
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Stt("unexpected remote STT response".to_string()))
}

async fn call_deepgram(
    api_key: &str,
    model: &str,
    wav: &[u8],
    language: Option<&str>,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();
    let mut url = format!("https://api.deepgram.com/v1/listen?model={model}&smart_format=true");
    if let Some(lang) = language {
        url.push_str(&format!("&language={lang}"));
    }

    let resp = client
        .post(&url)
        .header("Authorization", format!("Token {api_key}"))
        .header("Content-Type", "audio/wav")
        .body(wav.to_vec())
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Stt(format!("Deepgram {status}: {body}")));
    }

    let json: serde_json::Value = resp.json().await?;
    json["results"]["channels"][0]["alternatives"][0]["transcript"]
        .as_str()
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Stt("unexpected Deepgram response".to_string()))
}

/// Encode 16 kHz mono f32 samples (range -1.0..1.0) as a 16-bit PCM WAV blob.
fn encode_wav_16k_mono(samples: &[f32]) -> Vec<u8> {
    const SAMPLE_RATE: u32 = 16_000;
    const CHANNELS: u16 = 1;
    const BITS_PER_SAMPLE: u16 = 16;
    let byte_rate = SAMPLE_RATE * u32::from(CHANNELS) * u32::from(BITS_PER_SAMPLE) / 8;
    let block_align = CHANNELS * BITS_PER_SAMPLE / 8;
    let data_len = (samples.len() * 2) as u32;
    let chunk_size = 36 + data_len;

    let mut buf = Vec::with_capacity(44 + samples.len() * 2);
    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&chunk_size.to_le_bytes());
    buf.extend_from_slice(b"WAVE");
    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes());
    buf.extend_from_slice(&1u16.to_le_bytes()); // PCM
    buf.extend_from_slice(&CHANNELS.to_le_bytes());
    buf.extend_from_slice(&SAMPLE_RATE.to_le_bytes());
    buf.extend_from_slice(&byte_rate.to_le_bytes());
    buf.extend_from_slice(&block_align.to_le_bytes());
    buf.extend_from_slice(&BITS_PER_SAMPLE.to_le_bytes());
    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_len.to_le_bytes());

    for &s in samples {
        let clamped = s.clamp(-1.0, 1.0);
        let scaled = (clamped * i16::MAX as f32) as i16;
        buf.extend_from_slice(&scaled.to_le_bytes());
    }
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wav_header_is_well_formed() {
        let samples = vec![0.0_f32; 100];
        let wav = encode_wav_16k_mono(&samples);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(&wav[36..40], b"data");
        // 44-byte header + 100 samples * 2 bytes
        assert_eq!(wav.len(), 44 + 200);
    }

    #[test]
    fn openai_compat_url_handles_variants() {
        assert_eq!(
            build_openai_compat_url("https://host.tld"),
            "https://host.tld/v1/audio/transcriptions"
        );
        assert_eq!(
            build_openai_compat_url("https://host.tld/"),
            "https://host.tld/v1/audio/transcriptions"
        );
        assert_eq!(
            build_openai_compat_url("https://host.tld/v1"),
            "https://host.tld/v1/audio/transcriptions"
        );
        assert_eq!(
            build_openai_compat_url("https://host.tld/v1/audio/transcriptions"),
            "https://host.tld/v1/audio/transcriptions"
        );
    }
}
