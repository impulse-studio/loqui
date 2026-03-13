use crate::error::AppError;
use crate::model_manager::config::ModelManagerConfig;
use crate::model_manager::download;
use crate::stt::types::{ModelInfo, ModelStatus};
use std::path::PathBuf;
use tauri::{AppHandle, Runtime};
use tokio_util::sync::CancellationToken;

const MODEL_MANIFEST: &str = include_str!("model_manifest.json");

const CONFIG: ModelManagerConfig = ModelManagerConfig {
    dir_name: "models",
    event_prefix: "",
    error_label: "model",
    connect_timeout: None,
};

pub fn get_models() -> Result<Vec<ModelStatus>, AppError> {
    download::get_models::<ModelInfo>(MODEL_MANIFEST, &CONFIG)
}

pub fn get_model_path(model_id: &str) -> Result<PathBuf, AppError> {
    download::get_model_path::<ModelInfo>(model_id, MODEL_MANIFEST, &CONFIG)
}

pub fn verify_model(model_id: &str) -> Result<bool, AppError> {
    download::verify_model::<ModelInfo>(model_id, MODEL_MANIFEST, &CONFIG)
}

pub async fn download_model<R: Runtime>(
    model_id: &str,
    app_handle: &AppHandle<R>,
    cancel_token: CancellationToken,
) -> Result<(), AppError> {
    download::download_model::<ModelInfo, R>(
        model_id,
        MODEL_MANIFEST,
        &CONFIG,
        app_handle,
        cancel_token,
        AppError::Stt,
    )
    .await
}
