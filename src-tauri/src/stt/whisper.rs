use crate::error::AppError;
use crate::stt::types::TranscriptionResult;
use std::path::Path;
use std::time::Instant;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

pub struct WhisperEngine {
    context: WhisperContext,
}

impl WhisperEngine {
    pub fn load<P: AsRef<Path>>(model_path: P) -> Result<Self, AppError> {
        let path_str = model_path
            .as_ref()
            .to_str()
            .ok_or_else(|| AppError::Stt("invalid model path".to_string()))?;

        let context = WhisperContext::new_with_params(
            path_str,
            WhisperContextParameters::default(),
        )
        .map_err(|e| AppError::Stt(format!("failed to load model: {e}")))?;

        Ok(Self { context })
    }

    pub fn transcribe(
        &self,
        samples: &[f32],
        language: Option<&str>,
    ) -> Result<TranscriptionResult, AppError> {
        let start = Instant::now();

        let mut state = self
            .context
            .create_state()
            .map_err(|e| AppError::Stt(format!("failed to create state: {e}")))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(language);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_n_threads(4);

        state
            .full(params, samples)
            .map_err(|e| AppError::Stt(format!("transcription failed: {e}")))?;

        let num_segments = state.full_n_segments();

        let mut text = String::new();
        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                if let Ok(s) = segment.to_str_lossy() {
                    text.push_str(&s);
                }
            }
        }

        #[allow(clippy::cast_possible_truncation)]
        let duration_ms = start.elapsed().as_millis() as u64;

        Ok(TranscriptionResult {
            text: text.trim().to_string(),
            duration_ms,
        })
    }
}
