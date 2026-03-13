use crate::error::AppError;

/// Wraps the user's custom system prompt with strict output rules.
pub fn build_system_prompt(user_instructions: &str) -> String {
    format!(
        "You are a speech-to-text post-processor. The user will give you raw transcribed speech \
produced by an automatic speech recognition (ASR) system. The input is PHONETIC and may contain \
errors, misspellings, or words that look wrong but sound correct when read aloud.\n\n\
STRICT RULES (always follow these, they override everything else):\n\
1. Keep the SAME language as the user's input. If the input is French, output French. If English, output English.\n\
2. Never refuse to process the input. Never say you cannot understand it. Always return your best attempt.\n\
3. The input is phonetic transcription — interpret unclear words by how they SOUND, not how they are spelled. \
For example \"sé\" → \"c'est\", \"mwa\" → \"moi\", \"fransé\" → \"français\".\n\
4. Preserve proper nouns and special names. If an unknown word repeats multiple times, it is likely a proper noun — \
capitalize it and keep it as-is.\n\
5. If parts are genuinely unintelligible, keep them as close to the original as possible rather than removing them.\n\
6. Never add suggestions, options, bullet points, headers, or any formatting unless the instructions explicitly ask for it.\n\n\
OUTPUT FORMAT (mandatory):\n\
You MUST respond with a JSON object and nothing else. No markdown, no code fences, no extra text.\n\
{{\"refined_text\": \"<the cleaned-up text>\", \"message\": \"<optional short note about what you changed, or empty string>\"}}\n\n\
INSTRUCTIONS:\n{user_instructions}"
    )
}

/// Extracts `refined_text` from a JSON response. Falls back to raw text if parsing fails.
pub fn extract_refined_text(raw: &str) -> String {
    let trimmed = raw.trim();
    // Strip markdown code fences if the LLM wrapped the JSON
    let json_str = if trimmed.starts_with("```") {
        trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        trimmed
    };
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
        if let Some(text) = parsed["refined_text"].as_str() {
            return text.to_string();
        }
    }
    log::warn!("extract_refined_text: failed to parse JSON, falling back to raw text");
    trimmed.to_string()
}

pub struct RemoteRefactorResult {
    pub text: String,
    pub provider: String,
    pub model_used: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cost: f64,
}

pub fn attempt_remote(
    text: &str,
    system_prompt: &str,
    provider: &str,
    api_key: &str,
    model_name: &str,
) -> Result<RemoteRefactorResult, AppError> {
    // Bridge async→sync: create a one-shot tokio runtime
    // (process_recording runs on a plain std::thread, so there's no current runtime)
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Llm(format!("failed to create tokio runtime: {e}")))?;

    let result = rt.block_on(crate::llm::remote::refactor_remote(
        provider, api_key, model_name, system_prompt, text,
    ))?;

    let cost = crate::llm::pricing::estimate_cost(
        provider,
        model_name,
        result.input_tokens,
        result.output_tokens,
    );

    log::info!(
        "Pipeline: remote LLM refactored in {}ms ({} in + {} out tokens, ${:.4})",
        result.duration_ms,
        result.input_tokens,
        result.output_tokens,
        cost
    );

    Ok(RemoteRefactorResult {
        text: extract_refined_text(&result.text),
        provider: provider.to_string(),
        model_used: model_name.to_string(),
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost,
    })
}
