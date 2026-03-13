use crate::error::AppError;
use std::future::Future;
use std::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub async fn run_download_with_cancel<F, Fut>(
    cancel_mutex: &Mutex<Option<CancellationToken>>,
    download_fn: F,
) -> Result<(), AppError>
where
    F: FnOnce(CancellationToken) -> Fut,
    Fut: Future<Output = Result<(), AppError>>,
{
    let cancel_token = CancellationToken::new();

    {
        let mut guard = cancel_mutex.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = Some(cancel_token.clone());
    }

    let result = download_fn(cancel_token).await;

    {
        let mut guard = cancel_mutex.lock().map_err(|_| AppError::LockPoisoned)?;
        *guard = None;
    }

    result
}

pub fn cancel_download(cancel_mutex: &Mutex<Option<CancellationToken>>) -> Result<(), AppError> {
    let guard = cancel_mutex.lock().map_err(|_| AppError::LockPoisoned)?;
    if let Some(token) = guard.as_ref() {
        token.cancel();
    }
    Ok(())
}
