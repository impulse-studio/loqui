//! `SecretStore` trait — encrypted API key persistence.
//!
//! Implemented by `Database`. Values are encrypted with the master key loaded
//! at DB startup (see `security::secrets`) before being written to the
//! `secrets` SQLite table. Callers deal in plaintext `&str` values; the trait
//! hides the crypto layer.

use crate::error::AppError;

pub trait SecretStore {
    fn save_api_key(&self, account: &str, value: &str) -> Result<(), AppError>;
    fn get_api_key(&self, account: &str) -> Result<Option<String>, AppError>;
    fn delete_api_key(&self, account: &str) -> Result<(), AppError>;
    fn has_api_key(&self, account: &str) -> Result<bool, AppError>;
}
