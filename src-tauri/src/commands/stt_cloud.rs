use crate::error::AppError;
use crate::state::AppState;
use crate::storage::config::ConfigStore;
use crate::storage::secrets::SecretStore;
use crate::stt::remote;

const SUPPORTED: &[&str] = &["groq", "openai", "deepgram", "custom"];

fn account_for(provider: &str) -> Result<String, AppError> {
    let provider = provider.trim();
    if !SUPPORTED.contains(&provider) {
        return Err(AppError::Stt(format!("unknown STT provider: '{provider}'")));
    }
    Ok(remote::secret_account(provider))
}

#[tauri::command]
pub async fn save_stt_api_key(
    provider: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return db.delete_api_key(&account);
    }
    db.save_api_key(&account, trimmed)
}

#[tauri::command]
pub async fn has_stt_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.has_api_key(&account)
}

#[tauri::command]
pub async fn delete_stt_api_key(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let account = account_for(&provider)?;
    let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
    db.delete_api_key(&account)
}

/// Validate credentials against the provider's models endpoint.
/// If `api_key` is omitted, reads from the secret store — lets Settings verify
/// an already-saved key without re-entering it.
#[tauri::command]
pub async fn test_stt_provider(
    provider: String,
    api_key: Option<String>,
    custom_endpoint: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    if !SUPPORTED.contains(&provider.as_str()) {
        return Err(AppError::Stt(format!("unknown STT provider: '{provider}'")));
    }

    let (key, endpoint) = {
        let db = state.db.lock().map_err(|_| AppError::LockPoisoned)?;
        let key = match api_key {
            Some(k) if !k.trim().is_empty() => k,
            _ => remote::load_api_key(&db, &provider)?
                .ok_or_else(|| AppError::Stt(format!("no API key stored for '{provider}'")))?,
        };
        let endpoint = match custom_endpoint {
            Some(e) if !e.trim().is_empty() => Some(e),
            _ => db.get_config("sttCustomEndpoint").ok().flatten(),
        };
        (key, endpoint)
    };

    remote::verify_credentials(&provider, &key, endpoint.as_deref()).await
}
