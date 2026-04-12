use crate::activeapp::detector;
use crate::audio::capture::AudioCapture;
use crate::error::AppError;
use crate::llm::chunker;
use crate::paste::injector;
use crate::state::{AppState, RecordingContext};
use crate::storage::config::ConfigStore;
use crate::storage::profiles::{ProfileRow, ProfileStore};
use crate::storage::transcripts::{TranscriptRow, TranscriptStore};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

use super::refactor;

const MIN_RECORDING_MS: u128 = 300;

pub fn on_press(app_handle: &AppHandle) {
    log::info!("Pipeline: on_press triggered");
    let state = app_handle.state::<AppState>();

    // Guard: model must be loaded
    {
        let guard = state.whisper.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_none() {
            log::warn!("Pipeline: skipping — whisper model not loaded");
            return;
        }
    }

    // Guard: not already recording
    {
        let guard = state.recording_context.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_some() {
            log::warn!("Pipeline: skipping — already recording");
            return;
        }
    }

    // 1. Detect active app before we steal focus
    let (app_name, window_title) = detector::get_frontmost_app();
    // 2. Start audio capture (use configured device or default)
    let db = state.db.lock().unwrap_or_else(|e| e.into_inner());
    let device_name = db.get_config("microphoneDevice").ok().flatten().unwrap_or_default();
    drop(db);
    match AudioCapture::start(app_handle, &device_name) {
        Ok(capture) => {
            let mut guard = state.audio_capture.lock().unwrap_or_else(|e| e.into_inner());
            *guard = Some(capture);
        }
        Err(e) => {
            log::error!("Failed to start audio capture: {e}");
            let _ = emit_state(app_handle, "error");
            std::thread::sleep(std::time::Duration::from_secs(1));
            let _ = emit_state(app_handle, "idle");
            return;
        }
    }

    // 3. Store recording context
    log::info!("Pipeline: recording started for app={app_name}");
    {
        let mut guard = state.recording_context.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some(RecordingContext {
            app_name,
            window_title,
            start_time: Instant::now(),
        });
    }

    let _ = emit_state(app_handle, "recording");
}

/// Called by hotkey handler when the target combo is released.
pub fn on_release(app_handle: &AppHandle) {
    log::info!("Pipeline: on_release triggered");
    let state = app_handle.state::<AppState>();

    // Take recording context
    let context = {
        let mut guard = state.recording_context.lock().unwrap_or_else(|e| e.into_inner());
        guard.take()
    };

    let Some(context) = context else {
        log::warn!("Pipeline: on_release — was not recording, ignoring");
        return;
    };

    // Check min duration
    if context.start_time.elapsed().as_millis() < MIN_RECORDING_MS {
        let mut guard = state.audio_capture.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(mut capture) = guard.take() {
            let _ = capture.stop(); // discard
        }
        let _ = emit_state(app_handle, "idle");
        return;
    }

    // Spawn processing thread (transcription is CPU-bound)
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        if let Err(e) = process_recording(&handle, context) {
            log::error!("Pipeline error: {e}");
            let _ = emit_state(&handle, "error");
            std::thread::sleep(std::time::Duration::from_secs(2));
            let _ = emit_state(&handle, "idle");
        }
    });
}

fn process_recording(app_handle: &AppHandle, context: RecordingContext) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();
    let _ = emit_state(app_handle, "processing");

    // 1. Stop audio capture
    let buffer = {
        let mut guard = state.audio_capture.lock().map_err(|_| AppError::LockPoisoned)?;
        let mut capture = guard
            .take()
            .ok_or_else(|| AppError::Audio("no active recording".to_string()))?;
        capture.stop()?
    };

    let duration_secs = buffer.duration_secs();

    // 2. Transcribe
    let text = {
        let whisper_guard = state.whisper.lock().map_err(|_| AppError::LockPoisoned)?;
        let engine = whisper_guard
            .as_ref()
            .ok_or_else(|| AppError::Stt("model not loaded".to_string()))?;

        let language = {
            let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
            db.get_config("sttLanguage").ok().flatten()
        };
        let lang_ref = language.as_deref().filter(|l| *l != "auto");

        let result = engine.transcribe(&buffer.samples, lang_ref)?;
        result.text.trim().to_string()
    };

    log::info!("Pipeline: transcription result ({} chars): {:?}", text.len(), &text[..text.len().min(80)]);

    if text.is_empty() {
        let _ = emit_state(app_handle, "idle");
        return Ok(());
    }

    // 3. Emit transcription-complete (for onboarding step-test)
    let _ = app_handle.emit(
        "transcription-complete",
        serde_json::json!({ "text": &text }),
    );

    // 4. Only paste + save when onboarding is complete
    let onboarding_done = {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        db.get_config("onboardingComplete")
            .ok()
            .flatten()
            .map_or(false, |v| v == "true")
    };

    if !onboarding_done {
        log::info!("Pipeline: onboarding not complete — skipping refactoring, paste, and save");
    }

    if onboarding_done {
        // 5. Resolve profile
        let profile = resolve_profile(app_handle, &context.app_name);
        let profile_id = profile.as_ref().map(|p| p.id.clone());
        let profile_name = profile.as_ref().map(|p| p.name.clone());

        // 6. Attempt LLM refactoring (graceful degradation)
        let refactor_out = attempt_refactor(app_handle, &text, profile.as_ref());
        let refactored_text = refactor_out.as_ref().map(|r| r.text.clone());
        let final_text_owned;
        let final_text = match &refactored_text {
            Some(t) => { final_text_owned = t.clone(); &final_text_owned }
            None => &text,
        };

        // 7. Paste if autoPaste enabled
        let (auto_paste, copy_to_clipboard) = {
            let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
            let ap = db.get_config("autoPaste")
                .ok()
                .flatten()
                .map_or(true, |v| v != "false");
            let ctc = db.get_config("copyToClipboard")
                .ok()
                .flatten()
                .map_or(true, |v| v != "false");
            (ap, ctc)
        };

        if auto_paste {
            if let Err(e) = injector::paste_text(app_handle, final_text, copy_to_clipboard) {
                log::error!("Paste failed: {e}");
            }
        }

        // 8. Save transcript
        #[allow(clippy::cast_possible_truncation)]
        let word_count = text.split_whitespace().count() as i64;
        let wps = if duration_secs > 0.0 {
            #[allow(clippy::cast_precision_loss)]
            let w = word_count as f64 / duration_secs;
            (w * 10.0).round() / 10.0
        } else {
            0.0
        };

        let (t_provider, t_model, t_in, t_out, t_cost) = match &refactor_out {
            Some(r) => (
                r.provider.clone(),
                r.model_used.clone(),
                r.input_tokens as i64,
                r.output_tokens as i64,
                r.cost,
            ),
            None => (String::new(), String::new(), 0, 0, 0.0),
        };

        let transcript = TranscriptRow {
            id: uuid::Uuid::new_v4().to_string(),
            raw_text: text,
            refactored_text,
            app_name: context.app_name,
            window_title: context.window_title,
            profile_id,
            profile_name,
            word_count,
            duration: duration_secs,
            words_per_second: wps,
            status: "success".to_string(),
            error_message: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            llm_provider: t_provider,
            llm_model_used: t_model,
            llm_input_tokens: t_in,
            llm_output_tokens: t_out,
            llm_cost: t_cost,
        };

        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        if let Err(e) = db.save_transcript(&transcript) {
            log::error!("Failed to save transcript: {e}");
        }

        // Auto-prune if size-based retention is configured
        if let Ok(Some(retention)) = db.get_config("transcriptRetention") {
            if let Some(max_bytes) = parse_retention_bytes(&retention) {
                match db.prune_transcripts(max_bytes) {
                    Ok(n) if n > 0 => log::info!("Pruned {n} old transcripts (retention: {retention})"),
                    Err(e) => log::error!("Failed to prune transcripts: {e}"),
                    _ => {}
                }
            }
        }
    }

    // Success → idle
    let _ = emit_state(app_handle, "success");
    std::thread::sleep(std::time::Duration::from_millis(1500));
    let _ = emit_state(app_handle, "idle");

    Ok(())
}

fn resolve_profile(app_handle: &AppHandle, app_name: &str) -> Option<ProfileRow> {
    let state = app_handle.state::<AppState>();
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return None,
    };

    let profiles = match db.get_profiles() {
        Ok(p) => p,
        Err(_) => return None,
    };

    let app_lower = app_name.to_lowercase();

    // Match app_mappings
    for profile in &profiles {
        if let Ok(mappings) = serde_json::from_str::<Vec<String>>(&profile.app_mappings) {
            if mappings.iter().any(|m| m.to_lowercase() == app_lower) {
                return Some(profile.clone());
            }
        }
    }

    profiles.into_iter().find(|p| p.is_default)
}

struct PipelineRefactorResult {
    text: String,
    provider: String,
    model_used: String,
    input_tokens: u64,
    output_tokens: u64,
    cost: f64,
}

/// Attempt LLM refactoring. Returns None on any failure (graceful degradation).
fn attempt_refactor(
    app_handle: &AppHandle,
    text: &str,
    profile: Option<&ProfileRow>,
) -> Option<PipelineRefactorResult> {
    let state = app_handle.state::<AppState>();

    let Some(profile) = profile else {
        log::info!("Pipeline: no profile matched — skipping LLM refactoring");
        return None;
    };
    let provider = &profile.llm_provider;

    // Disabled or empty provider → skip
    if provider.is_empty() || provider == "disabled" {
        log::info!("Pipeline: LLM disabled for profile '{}' (provider={provider})", profile.name);
        return None;
    }
    if profile.system_prompt.is_empty() {
        log::warn!("Pipeline: empty system prompt for profile '{}' — skipping LLM", profile.name);
        return None;
    }

    let ctx_size = profile.context_size as u32;

    if provider != "local" {
        // Remote provider: read per-provider API key
        let cap = provider.chars().next().map_or(String::new(), |c| {
            c.to_uppercase().to_string() + &provider[1..]
        });
        let api_key_name = format!("llmApiKey{cap}");
        let api_key = {
            let db = state.db.lock().ok()?;
            db.get_config(&api_key_name).ok().flatten().unwrap_or_default()
        };
        if api_key.is_empty() {
            log::warn!("Pipeline: API key not set for provider {provider}");
            return None;
        }

        let model = &profile.llm_model;
        if model.is_empty() {
            log::warn!("Pipeline: no model configured for remote provider {provider}");
            return None;
        }

        let full_prompt = refactor::build_system_prompt(&profile.system_prompt);
        return refactor::attempt_remote(text, &full_prompt, provider, &api_key, model)
            .map(|r| PipelineRefactorResult {
                text: r.text, provider: r.provider, model_used: r.model_used,
                input_tokens: r.input_tokens, output_tokens: r.output_tokens, cost: r.cost,
            })
            .map_err(|e| log::error!("Pipeline: remote LLM failed: {e}"))
            .ok();
    }

    // Local: hot-swap model if needed
    let model_id = if profile.llm_model.is_empty() {
        log::warn!("Pipeline: no local LLM model configured");
        return None;
    } else {
        profile.llm_model.clone()
    };

    // Hot-swap: load different model if needed
    {
        let loaded = state.loaded_llm_id.lock().ok()?;
        if loaded.as_deref() != Some(&model_id) {
            drop(loaded);
            log::info!("Pipeline: hot-swapping LLM model to {model_id}");
            if let Err(e) = hot_swap_llm(app_handle, &model_id) {
                log::error!("Pipeline: LLM hot-swap failed: {e}");
                return None;
            }
        }
    }

    // Generate
    let guard = state.llm.lock().ok()?;
    let engine = guard.as_ref()?;
    let full_prompt = refactor::build_system_prompt(&profile.system_prompt);

    // Check if chunking is needed
    let available_tokens = ctx_size.saturating_sub(256) as usize;
    let prompt_tokens = engine.count_tokens(&full_prompt).unwrap_or(0);
    let text_budget = available_tokens.saturating_sub(prompt_tokens);

    let text_tokens = engine.count_tokens(text).unwrap_or(0);

    if text_tokens <= text_budget {
        // Single pass
        match engine.generate(&full_prompt, text, ctx_size) {
            Ok(result) => {
                log::info!("Pipeline: LLM refactored in {}ms", result.duration_ms);
                Some(PipelineRefactorResult {
                    text: refactor::extract_refined_text(&result.text),
                    provider: "local".to_string(),
                    model_used: model_id,
                    input_tokens: result.input_tokens,
                    output_tokens: result.output_tokens,
                    cost: 0.0,
                })
            }
            Err(e) => {
                log::error!("Pipeline: LLM generation failed: {e}");
                None
            }
        }
    } else {
        // Chunked processing
        log::info!("Pipeline: text exceeds budget ({text_tokens} > {text_budget}), chunking");
        match chunker::chunk_text(engine, text, text_budget) {
            Ok(chunks) => {
                let mut parts = Vec::new();
                let mut total_in: u64 = 0;
                let mut total_out: u64 = 0;
                for chunk in &chunks {
                    match engine.generate(&full_prompt, chunk, ctx_size) {
                        Ok(result) => {
                            total_in += result.input_tokens;
                            total_out += result.output_tokens;
                            parts.push(refactor::extract_refined_text(&result.text));
                        }
                        Err(e) => {
                            log::error!("Pipeline: chunk generation failed: {e}");
                            return None;
                        }
                    }
                }
                Some(PipelineRefactorResult {
                    text: parts.join(" "),
                    provider: "local".to_string(),
                    model_used: model_id,
                    input_tokens: total_in,
                    output_tokens: total_out,
                    cost: 0.0,
                })
            }
            Err(e) => {
                log::error!("Pipeline: chunking failed: {e}");
                None
            }
        }
    }
}

fn hot_swap_llm(app_handle: &AppHandle, model_id: &str) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();

    // Unload current
    {
        let mut guard = state.llm.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = None;
    }

    // Load new
    let model_path = crate::llm::model_manager::get_model_path(model_id)?;
    let engine = crate::llm::engine::LlmEngine::load(&model_path)?;

    {
        let mut guard = state.llm.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(engine);
    }
    {
        let mut guard = state
            .loaded_llm_id
            .lock()
            .map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(model_id.to_string());
    }

    let _ = app_handle.emit(
        "llm-model-loaded",
        serde_json::json!({ "modelId": model_id }),
    );

    Ok(())
}

fn emit_state(app_handle: &AppHandle, state: &str) -> Result<(), tauri::Error> {
    app_handle.emit("agent-state-changed", serde_json::json!({ "state": state }))
}

fn parse_retention_bytes(value: &str) -> Option<i64> {
    match value {
        "100mb" => Some(104_857_600),
        "500mb" => Some(524_288_000),
        "1gb" => Some(1_073_741_824),
        "5gb" => Some(5_368_709_120),
        _ => None,
    }
}
