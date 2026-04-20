use crate::error::AppError;
use crate::storage::database::Database;
use crate::storage::secrets::SecretStore;
use std::time::Instant;

/// Secret-store account for a given LLM provider (e.g. `"openai"` → `"llm.openai"`).
pub fn secret_account(provider: &str) -> String {
    format!("llm.{provider}")
}

/// Read the API key for an LLM provider from the encrypted secret store.
/// Returns `Ok(None)` when no key is configured.
pub fn load_api_key(db: &Database, provider: &str) -> Result<Option<String>, AppError> {
    db.get_api_key(&secret_account(provider))
}

#[derive(serde::Serialize, Clone)]
pub struct RemoteModelEntry {
    pub id: String,
    pub name: String,
    pub created: u64,
    pub badge: Option<String>,
}

pub struct RemoteResult {
    pub text: String,
    pub duration_ms: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
}

pub async fn refactor_remote(
    provider: &str,
    api_key: &str,
    model_name: &str,
    system_prompt: &str,
    text: &str,
) -> Result<RemoteResult, AppError> {
    if api_key.trim().is_empty() {
        return Err(AppError::Llm(format!("no API key configured for {provider}")));
    }
    if model_name.is_empty() {
        return Err(AppError::Llm(format!("no model selected for {provider}")));
    }

    let start = Instant::now();
    let api_key = api_key.trim();

    log::info!("Remote LLM: provider={provider}, model={model_name}");

    let (result_text, input_tokens, output_tokens) = match provider {
        "openai" => call_openai(api_key, model_name, system_prompt, text).await?,
        "anthropic" => call_anthropic(api_key, model_name, system_prompt, text).await?,
        "google" => call_google(api_key, model_name, system_prompt, text).await?,
        _ => return Err(AppError::Llm(format!("unknown provider: {provider}"))),
    };

    Ok(RemoteResult {
        text: result_text,
        duration_ms: start.elapsed().as_millis() as u64,
        input_tokens,
        output_tokens,
    })
}

async fn call_openai(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    text: &str,
) -> Result<(String, u64, u64), AppError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": text }
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("OpenAI {status}: {err_text}")));
    }

    let json: serde_json::Value = resp.json().await?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Llm("unexpected OpenAI response format".to_string()))?;

    let input_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0);
    let output_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0);

    Ok((content, input_tokens, output_tokens))
}

async fn call_anthropic(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    text: &str,
) -> Result<(String, u64, u64), AppError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            { "role": "user", "content": text }
        ],
    });

    log::debug!("Anthropic request: model={model}, system_len={}, text_len={}", system_prompt.len(), text.len());

    let is_oat = api_key.starts_with("sk-ant-oat");
    let mut req = client
        .post("https://api.anthropic.com/v1/messages")
        .header("anthropic-version", "2023-06-01");
    req = if is_oat {
        req.header("Authorization", format!("Bearer {api_key}"))
            .header("anthropic-beta", "oauth-2025-04-20")
    } else {
        req.header("x-api-key", api_key)
    };
    let resp = req.json(&body).send().await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        log::error!("Anthropic {status} for model={model}: {err_text}");
        // Anthropic returns a generic 400 "Error" when the model isn't
        // available for the account/subscription tier
        if status.as_u16() == 400 && err_text.contains("\"message\":\"Error\"") {
            return Err(AppError::Llm(format!(
                "model '{model}' is not available for your Anthropic account — try a different model"
            )));
        }
        return Err(AppError::Llm(format!("Anthropic {status}: {err_text}")));
    }

    let json: serde_json::Value = resp.json().await?;
    let content = json["content"][0]["text"]
        .as_str()
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Llm("unexpected Anthropic response format".to_string()))?;

    let input_tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0);
    let output_tokens = json["usage"]["output_tokens"].as_u64().unwrap_or(0);

    Ok((content, input_tokens, output_tokens))
}

async fn call_google(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    text: &str,
) -> Result<(String, u64, u64), AppError> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );

    let body = serde_json::json!({
        "system_instruction": {
            "parts": [{ "text": system_prompt }]
        },
        "contents": [{
            "parts": [{ "text": text }]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 4096,
        },
    });

    let resp = client.post(&url).json(&body).send().await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("Google {status}: {err_text}")));
    }

    let json: serde_json::Value = resp.json().await?;
    let content = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(ToString::to_string)
        .ok_or_else(|| AppError::Llm("unexpected Google response format".to_string()))?;

    let input_tokens = json["usageMetadata"]["promptTokenCount"].as_u64().unwrap_or(0);
    let output_tokens = json["usageMetadata"]["candidatesTokenCount"].as_u64().unwrap_or(0);

    Ok((content, input_tokens, output_tokens))
}

// --- Model listing (via OpenRouter public API — no auth needed) ---

pub async fn list_remote_models(
    provider: &str,
) -> Result<Vec<RemoteModelEntry>, AppError> {
    let prefix = match provider {
        "openai" => "openai/",
        "anthropic" => "anthropic/",
        "google" => "google/",
        _ => return Err(AppError::Llm(format!("unknown provider: {provider}"))),
    };

    let client = reqwest::Client::new();
    let resp = client
        .get("https://openrouter.ai/api/v1/models")
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("model list fetch {status}: {err_text}")));
    }

    let json: serde_json::Value = resp.json().await?;
    let mut models: Vec<RemoteModelEntry> = json["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| {
            let id = m["id"].as_str()?;
            if !id.starts_with(prefix) {
                return None;
            }
            // Skip OpenRouter-specific variants (:free, :extended, :thinking)
            if id.contains(':') {
                return None;
            }
            // Only keep text-output models (skip image/audio generators)
            let output_mods = m["architecture"]["output_modalities"].as_array();
            if let Some(mods) = output_mods {
                let is_text_only =
                    mods.len() == 1 && mods[0].as_str() == Some("text");
                if !is_text_only {
                    return None;
                }
            }

            let raw_id = id.strip_prefix(prefix).unwrap_or(id);
            // Anthropic API uses dashes, not dots (e.g. claude-sonnet-4-6, not 4.6)
            let native_id = if provider == "anthropic" {
                raw_id.replace('.', "-")
            } else {
                raw_id.to_string()
            };
            // Skip non-API models for Google (gemma = open-source, not Gemini API)
            if provider == "google" && native_id.starts_with("gemma") {
                return None;
            }
            let name = m["name"].as_str().unwrap_or(&native_id);
            // Strip provider prefix from display name
            let clean_name = name
                .strip_prefix("Anthropic: ")
                .or_else(|| name.strip_prefix("OpenAI: "))
                .or_else(|| name.strip_prefix("Google: "))
                .unwrap_or(name)
                .to_string();
            let created = m["created"].as_u64().unwrap_or(0);
            // Tag Anthropic haiku models as Claude Code compatible (OAuth)
            let badge = if provider == "anthropic"
                && native_id.contains("haiku")
            {
                Some("Claude Code".to_string())
            } else {
                None
            };
            Some(RemoteModelEntry {
                id: native_id,
                name: clean_name,
                created,
                badge,
            })
        })
        .collect();

    // Sort by newest first
    models.sort_by(|a, b| b.created.cmp(&a.created));
    Ok(models)
}
