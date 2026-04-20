//! Encrypted secrets — crypto primitives.
//!
//! Provides a master key (persisted to disk) plus AES-256-GCM encrypt/decrypt
//! helpers. This module knows nothing about databases or the app domain — it
//! is a pure crypto layer used by `storage::secrets` to store API keys.
//!
//! Master key file lives next to the SQLite database at
//! `{data_dir}/com.impulselab.loqui/master.key`. First call creates a fresh
//! 32-byte random key and chmods it to `0600` on Unix. Subsequent calls load
//! the existing key.
//!
//! Encoding: `hex(nonce || ciphertext_with_tag)` — a 12-byte nonce prefixes
//! the GCM ciphertext (which already contains the 16-byte auth tag). The hex
//! string splits at offset 24 (12 bytes * 2 hex chars) on decode.
//!
//! NOTE: this scheme is OS-agnostic and avoids keychain prompts, but the
//! master key sits on disk alongside the DB. Anyone with read access to the
//! user's data directory can decrypt. For stronger at-rest protection the
//! master key would need to move to the OS keystore — that is explicitly out
//! of scope for this module.

use crate::error::AppError;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use rand::RngCore;
use rand::rngs::OsRng;
use std::path::PathBuf;

const MASTER_KEY_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const NONCE_HEX_LEN: usize = NONCE_LEN * 2;

/// 32-byte AES-256 master key, loaded from or generated into `master.key`.
#[derive(Clone)]
pub struct MasterKey([u8; MASTER_KEY_LEN]);

impl MasterKey {
    /// Load the master key from disk, generating a new random key on first use.
    pub fn load_or_create() -> Result<Self, AppError> {
        let path = master_key_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        if path.exists() {
            let bytes = std::fs::read(&path)?;
            if bytes.len() != MASTER_KEY_LEN {
                return Err(AppError::Secret(format!(
                    "master key file has wrong length: expected {MASTER_KEY_LEN}, got {}",
                    bytes.len()
                )));
            }
            let mut key = [0u8; MASTER_KEY_LEN];
            key.copy_from_slice(&bytes);
            return Ok(Self(key));
        }

        let mut key = [0u8; MASTER_KEY_LEN];
        OsRng.fill_bytes(&mut key);
        std::fs::write(&path, key)?;
        #[cfg(unix)]
        restrict_permissions(&path)?;
        Ok(Self(key))
    }

    fn cipher(&self) -> Aes256Gcm {
        let key = Key::<Aes256Gcm>::from_slice(&self.0);
        Aes256Gcm::new(key)
    }
}

/// Encrypt `plaintext` with `master`, returning `hex(nonce || ciphertext_with_tag)`.
pub fn encrypt(master: &MasterKey, plaintext: &[u8]) -> Result<String, AppError> {
    let cipher = master.cipher();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| AppError::Secret(format!("encrypt failed: {e}")))?;

    let mut combined = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);
    Ok(hex::encode(combined))
}

/// Decrypt a hex-encoded payload produced by [`encrypt`].
/// Returns the raw plaintext bytes.
pub fn decrypt(master: &MasterKey, encoded: &str) -> Result<Vec<u8>, AppError> {
    if encoded.len() < NONCE_HEX_LEN {
        return Err(AppError::Secret("ciphertext too short".to_string()));
    }
    let raw = hex::decode(encoded)
        .map_err(|e| AppError::Secret(format!("invalid hex: {e}")))?;
    if raw.len() < NONCE_LEN {
        return Err(AppError::Secret("ciphertext too short".to_string()));
    }
    let (nonce_bytes, ct) = raw.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = master.cipher();
    cipher
        .decrypt(nonce, ct)
        .map_err(|e| AppError::Secret(format!("decrypt failed: {e}")))
}

fn master_key_path() -> PathBuf {
    let mut path = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("com.impulselab.loqui");
    path.push("master.key");
    path
}

#[cfg(unix)]
fn restrict_permissions(path: &std::path::Path) -> Result<(), AppError> {
    use std::os::unix::fs::PermissionsExt;
    let mut perms = std::fs::metadata(path)?.permissions();
    perms.set_mode(0o600);
    std::fs::set_permissions(path, perms)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fresh_master() -> MasterKey {
        let mut bytes = [0u8; MASTER_KEY_LEN];
        OsRng.fill_bytes(&mut bytes);
        MasterKey(bytes)
    }

    #[test]
    fn roundtrip_preserves_plaintext() {
        let master = fresh_master();
        let plaintext = b"sk-test-key-1234567890";
        let ct = encrypt(&master, plaintext).unwrap();
        let pt = decrypt(&master, &ct).unwrap();
        assert_eq!(pt, plaintext);
    }

    #[test]
    fn tamper_detection() {
        let master = fresh_master();
        let ct = encrypt(&master, b"hello").unwrap();
        // Flip a byte in the ciphertext portion (skip nonce hex prefix)
        let mut bytes = ct.into_bytes();
        let idx = NONCE_HEX_LEN + 2;
        bytes[idx] = if bytes[idx] == b'a' { b'b' } else { b'a' };
        let tampered = String::from_utf8(bytes).unwrap();
        assert!(decrypt(&master, &tampered).is_err());
    }

    #[test]
    fn wrong_key_fails() {
        let a = fresh_master();
        let b = fresh_master();
        let ct = encrypt(&a, b"secret").unwrap();
        assert!(decrypt(&b, &ct).is_err());
    }

    #[test]
    fn nonce_varies_across_calls() {
        let master = fresh_master();
        let ct1 = encrypt(&master, b"same").unwrap();
        let ct2 = encrypt(&master, b"same").unwrap();
        assert_ne!(ct1, ct2);
    }

    #[test]
    fn short_input_errors_cleanly() {
        let master = fresh_master();
        assert!(decrypt(&master, "").is_err());
        assert!(decrypt(&master, "abcd").is_err());
    }
}
