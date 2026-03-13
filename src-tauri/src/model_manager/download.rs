use crate::error::AppError;
use crate::model_manager::config::ModelManagerConfig;
use crate::model_manager::types::ModelStatus;
use futures_util::StreamExt;
use serde::de::DeserializeOwned;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::io::AsyncWriteExt;
use tokio_util::sync::CancellationToken;

pub trait ModelInfo: Clone {
    fn id(&self) -> &str;
    fn file_name(&self) -> &str;
    fn size(&self) -> u64;
    fn sha256(&self) -> &str;
    fn url(&self) -> &str;
}

pub fn get_models_dir(config: &ModelManagerConfig) -> Result<PathBuf, AppError> {
    let data_dir = dirs_next::data_dir().ok_or_else(|| {
        AppError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "could not determine data directory",
        ))
    })?;
    let models_dir = data_dir
        .join("com.impulselab.loqui")
        .join(config.dir_name);
    std::fs::create_dir_all(&models_dir)?;
    Ok(models_dir)
}

pub fn get_models<M>(
    manifest_json: &str,
    config: &ModelManagerConfig,
) -> Result<Vec<ModelStatus<M>>, AppError>
where
    M: ModelInfo + DeserializeOwned + Serialize,
{
    let models: Vec<M> = serde_json::from_str(manifest_json)?;
    let models_dir = get_models_dir(config)?;

    let statuses = models
        .into_iter()
        .map(|info| {
            let path = models_dir.join(info.file_name());
            let downloaded = path.exists();
            ModelStatus { info, downloaded }
        })
        .collect();

    Ok(statuses)
}

pub fn get_model_path<M>(
    model_id: &str,
    manifest_json: &str,
    config: &ModelManagerConfig,
) -> Result<PathBuf, AppError>
where
    M: ModelInfo + DeserializeOwned,
{
    let models: Vec<M> = serde_json::from_str(manifest_json)?;
    let model = models
        .iter()
        .find(|m| m.id() == model_id)
        .ok_or_else(|| AppError::NotFound(format!("{} {model_id}", config.error_label)))?;

    Ok(get_models_dir(config)?.join(model.file_name()))
}

pub fn verify_model<M>(
    model_id: &str,
    manifest_json: &str,
    config: &ModelManagerConfig,
) -> Result<bool, AppError>
where
    M: ModelInfo + DeserializeOwned,
{
    let models: Vec<M> = serde_json::from_str(manifest_json)?;
    let model = models
        .iter()
        .find(|m| m.id() == model_id)
        .ok_or_else(|| AppError::NotFound(format!("{} {model_id}", config.error_label)))?;

    let path = get_models_dir(config)?.join(model.file_name());
    if !path.exists() {
        return Ok(false);
    }

    let bytes = std::fs::read(&path)?;
    let hash = hex::encode(Sha256::digest(&bytes));
    Ok(hash == model.sha256())
}

#[allow(clippy::cast_precision_loss)]
pub async fn download_model<M, R>(
    model_id: &str,
    manifest_json: &str,
    config: &ModelManagerConfig,
    app_handle: &AppHandle<R>,
    cancel_token: CancellationToken,
    error_fn: fn(String) -> AppError,
) -> Result<(), AppError>
where
    M: ModelInfo + DeserializeOwned,
    R: Runtime,
{
    let models: Vec<M> = serde_json::from_str(manifest_json)?;
    let model = models
        .into_iter()
        .find(|m| m.id() == model_id)
        .ok_or_else(|| AppError::NotFound(format!("{} {model_id}", config.error_label)))?;

    let models_dir = get_models_dir(config)?;
    let dest_path = models_dir.join(model.file_name());
    let temp_path = models_dir.join(format!("{}.part", model.file_name()));

    let mut client_builder = reqwest::Client::builder();
    if let Some(timeout) = config.connect_timeout {
        client_builder = client_builder.connect_timeout(timeout);
    }
    let client = client_builder.build()?;

    let expected_sha = fetch_remote_sha256(&client, model.url())
        .await
        .unwrap_or_else(|| model.sha256().to_string());

    let response = client.get(model.url()).send().await?;

    if !response.status().is_success() {
        return Err(AppError::Http(response.error_for_status().unwrap_err()));
    }

    let total = response.content_length().unwrap_or(model.size());
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&temp_path).await?;
    let mut downloaded: u64 = 0;
    let start_time = std::time::Instant::now();

    let progress_event = format!("{}download-progress", config.event_prefix);
    let complete_event = format!("{}download-complete", config.event_prefix);

    while let Some(chunk_result) = tokio::select! {
        chunk = stream.next() => chunk,
        () = cancel_token.cancelled() => {
            let _ = tokio::fs::remove_file(&temp_path).await;
            return Err(AppError::Cancelled);
        }
    } {
        let chunk = chunk_result?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let elapsed = start_time.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            downloaded as f64 / elapsed
        } else {
            0.0
        };

        let _ = app_handle.emit(
            &progress_event,
            serde_json::json!({
                "modelId": model.id(),
                "downloaded": downloaded,
                "total": total,
                "speed": speed,
            }),
        );
    }

    file.flush().await?;
    drop(file);

    let bytes = tokio::fs::read(&temp_path).await?;
    let hash = hex::encode(Sha256::digest(&bytes));
    if hash != expected_sha {
        let _ = tokio::fs::remove_file(&temp_path).await;
        return Err(error_fn(format!(
            "SHA-256 mismatch: expected {expected_sha}, got {hash}",
        )));
    }

    tokio::fs::rename(&temp_path, &dest_path).await?;

    let _ = app_handle.emit(
        &complete_event,
        serde_json::json!({ "modelId": model.id() }),
    );

    Ok(())
}

async fn fetch_remote_sha256(client: &reqwest::Client, url: &str) -> Option<String> {
    let resp = client.head(url).send().await.ok()?;
    let etag = resp.headers().get("x-linked-etag")?.to_str().ok()?;
    Some(etag.trim_matches('"').to_string())
}
