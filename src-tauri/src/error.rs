use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("audio error: {0}")]
    Audio(String),

    #[error("stt error: {0}")]
    Stt(String),

    #[error("hotkey error: {0}")]
    Hotkey(String),

    #[error("llm error: {0}")]
    Llm(String),

    #[error("lock poisoned")]
    LockPoisoned,

    #[error("not found: {0}")]
    NotFound(String),

    #[error("window error: {0}")]
    Window(String),

    #[error("{0}")]
    Custom(String),

    #[error("operation cancelled")]
    Cancelled,
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
