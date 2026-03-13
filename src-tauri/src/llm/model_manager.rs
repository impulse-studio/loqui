use crate::error::AppError;
use crate::llm::types::{LlmModelInfo, LlmModelStatus};
use crate::model_manager::config::ModelManagerConfig;
use crate::model_manager::download;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Runtime};
use tokio_util::sync::CancellationToken;

const MODEL_MANIFEST: &str = include_str!("llm_model_manifest.json");

const CONFIG: ModelManagerConfig = ModelManagerConfig {
    dir_name: "llm-models",
    event_prefix: "llm-",
    error_label: "llm model",
    connect_timeout: Some(Duration::from_secs(30)),
};

pub fn get_models() -> Result<Vec<LlmModelStatus>, AppError> {
    download::get_models::<LlmModelInfo>(MODEL_MANIFEST, &CONFIG)
}

pub fn get_model_path(model_id: &str) -> Result<PathBuf, AppError> {
    download::get_model_path::<LlmModelInfo>(model_id, MODEL_MANIFEST, &CONFIG)
}

pub fn verify_model(model_id: &str) -> Result<bool, AppError> {
    download::verify_model::<LlmModelInfo>(model_id, MODEL_MANIFEST, &CONFIG)
}

pub async fn download_model<R: Runtime>(
    model_id: &str,
    app_handle: &AppHandle<R>,
    cancel_token: CancellationToken,
) -> Result<(), AppError> {
    download::download_model::<LlmModelInfo, R>(
        model_id,
        MODEL_MANIFEST,
        &CONFIG,
        app_handle,
        cancel_token,
        AppError::Llm,
    )
    .await
}
