use crate::commands::model_helpers;
use crate::error::AppError;
use crate::stt::model_manager;
use crate::stt::types::ModelStatus;
use crate::state::AppState;

#[tauri::command]
pub async fn get_models() -> Result<Vec<ModelStatus>, AppError> {
    model_manager::get_models()
}

#[tauri::command]
pub async fn download_model(
    model_id: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    model_helpers::run_download_with_cancel(&state.download_cancel, |token| {
        model_manager::download_model(&model_id, &app_handle, token)
    })
    .await
}

#[tauri::command]
pub async fn cancel_download(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    model_helpers::cancel_download(&state.download_cancel)
}

#[tauri::command]
pub async fn verify_model(model_id: String) -> Result<bool, AppError> {
    model_manager::verify_model(&model_id)
}
