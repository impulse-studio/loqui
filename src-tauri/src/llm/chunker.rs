/// Split text into chunks that fit within a token budget.
///
/// Strategy: split on sentence boundaries (`. `, `! `, `? `), then group
/// sentences greedily until the next sentence would exceed the budget.
/// Falls back to splitting on whitespace for very long sentences.

use crate::error::AppError;
use crate::llm::engine::LlmEngine;

pub fn chunk_text(
    engine: &LlmEngine,
    text: &str,
    max_tokens: usize,
) -> Result<Vec<String>, AppError> {
    if max_tokens == 0 {
        return Ok(vec![text.to_string()]);
    }

    let total = engine.count_tokens(text)?;
    if total <= max_tokens {
        return Ok(vec![text.to_string()]);
    }

    let sentences = split_sentences(text);
    let mut chunks = Vec::new();
    let mut current = String::new();
    let mut current_tokens: usize = 0;

    for sentence in &sentences {
        let sent_tokens = engine.count_tokens(sentence)?;

        // Single sentence exceeds budget — split on whitespace
        if sent_tokens > max_tokens {
            if !current.is_empty() {
                chunks.push(current.trim().to_string());
                current = String::new();
                current_tokens = 0;
            }
            chunks.extend(split_long_sentence(engine, sentence, max_tokens)?);
            continue;
        }

        if current_tokens + sent_tokens > max_tokens {
            chunks.push(current.trim().to_string());
            current = String::new();
            current_tokens = 0;
        }

        current.push_str(sentence);
        current_tokens += sent_tokens;
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_string());
    }

    Ok(chunks)
}

fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut start = 0;

    for (i, _) in text.match_indices(|c| c == '.' || c == '!' || c == '?') {
        let end = i + 1;
        // Include trailing space if present
        let end = if text.get(end..end + 1) == Some(" ") {
            end + 1
        } else {
            end
        };
        sentences.push(text[start..end].to_string());
        start = end;
    }

    if start < text.len() {
        sentences.push(text[start..].to_string());
    }

    sentences
}

fn split_long_sentence(
    engine: &LlmEngine,
    sentence: &str,
    max_tokens: usize,
) -> Result<Vec<String>, AppError> {
    let words: Vec<&str> = sentence.split_whitespace().collect();
    let mut chunks = Vec::new();
    let mut current = String::new();
    let mut current_tokens: usize = 0;

    for word in words {
        let word_tokens = engine.count_tokens(word)?;
        if current_tokens + word_tokens + 1 > max_tokens && !current.is_empty() {
            chunks.push(current.trim().to_string());
            current = String::new();
            current_tokens = 0;
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
        current_tokens += word_tokens;
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_string());
    }

    Ok(chunks)
}
