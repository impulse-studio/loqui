---
name: rust-best-practices
description: Enforces Rust project conventions for a Tauri 2 backend including modern module style, proper error handling, command separation, snake_case naming, and clippy compliance. Use when creating or modifying Rust source files.
compatibility: Requires bash, grep, find, cargo. Designed for Tauri 2 Rust backends.
allowed-tools: Bash(bash:*) Read
---

# Rust Best Practices

## Module Organization

Use the **modern file-per-module style** (not `mod.rs`):

```
src/
  audio.rs            # module root (pub mod capture; pub mod types;)
  audio/
    capture.rs
    types.rs
  storage.rs           # module root
  storage/
    database.rs
    config.rs
```

Never use `mod.rs` — the module root is a sibling `.rs` file with the same name as the folder.

## File & Naming Conventions

- Files: `snake_case.rs`
- Types (structs, enums, traits): `UpperCamelCase`
- Functions, methods: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- Acronyms in types: treated as single word (`Uuid`, `HttpClient`, not `UUID`, `HTTPClient`)
- No `get_` prefix on getters
- No module-name stuttering (`storage::Database`, not `storage::StorageDatabase`)

## Function Density

Keep files focused — aim for few `pub fn` per file:

- **Warn at 5+** public functions per file
- **Fail at 8+** public functions per file
- `commands/` is exempt (thin wrappers grouped by domain)

When a file grows beyond 5 `pub fn`, split into smaller modules. Each file should have a single responsibility.

## No Duplication

Extract shared logic into reusable modules. Use **config structs** and **traits** to parameterize behavior:

```rust
// Shared config struct — allows different modules to reuse the same logic
pub struct ModelManagerConfig {
    pub dir_name: &'static str,
    pub event_prefix: &'static str,
}

// Trait for type-safe abstraction over domain-specific types
pub trait ModelInfo: Clone {
    fn id(&self) -> &str;
    fn file_name(&self) -> &str;
}

// Domain module becomes a thin delegation layer
const CONFIG: ModelManagerConfig = ModelManagerConfig { dir_name: "models", event_prefix: "" };
pub fn get_models() -> Result<Vec<ModelStatus>, AppError> {
    download::get_models::<ModelInfo>(MANIFEST, &CONFIG)
}
```

Same-named `.rs` files across different directories must NOT exceed 85% similarity.

## File Size

- **Warn at 350+ lines**
- **Fail at 500+ lines**

Same thresholds as React/TS. Split into smaller modules when approaching the limit.

## Error Handling

Use `thiserror` for structured error types. Never use `.map_err(|e| e.to_string())`.

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("lock poisoned")]
    LockPoisoned,
}

// For Tauri commands: implement Serialize manually
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

Commands use `Result<T, AppError>` — not `Result<T, String>`.

## Command Separation

Tauri commands live in `commands/` module, split by domain. `lib.rs` stays lean.

```
src/
  lib.rs               # mod declarations + builder setup only
  error.rs             # AppError
  state.rs             # AppState
  commands.rs          # pub mod config; pub mod profiles; pub mod transcripts;
  commands/
    config.rs          # #[tauri::command] pub async fn get_config(...)
    model_helpers.rs   # shared download/cancel logic
    profiles.rs
    transcripts.rs
```

Command handlers are **thin wrappers**: acquire state, call domain logic, map errors.
Domain modules (`storage/`, `audio/`, `stt/`) contain no Tauri-specific code.

## State Management

Define `AppState` in `state.rs` with `Mutex<T>` fields:

```rust
pub struct AppState {
    pub db: Mutex<Database>,
}
```

Use `std::sync::Mutex` (not `tokio::sync::Mutex`) unless you hold the lock across `.await` points.

## Re-exports

Each module root re-exports its key types for clean imports:

```rust
// storage.rs
pub mod config;
pub mod database;
pub mod profiles;
pub mod transcripts;
```

Consumers use `use crate::storage::database::Database`.

## Clippy

Pedantic lints are enabled in `Cargo.toml`:

```toml
[lints.clippy]
pedantic = { level = "warn", priority = -1 }
module_name_repetitions = "allow"
must_use_candidate = "allow"
missing_errors_doc = "allow"
missing_panics_doc = "allow"

[lints.rust]
unsafe_code = "deny"
```

Fix all actionable clippy warnings. Use `#[allow(clippy::...)]` only with justification for specific lines.

## Verification Scripts

All checks live in `.doctor/scripts/rust/` and are run via `bash .doctor/run.sh src`:

1. **Module style**: `bash .doctor/scripts/rust/verify-module-style.sh src-tauri/src`
2. **File naming**: `bash .doctor/scripts/rust/verify-naming.sh src-tauri/src`
3. **Error handling**: `bash .doctor/scripts/rust/verify-error-handling.sh src-tauri/src`
4. **Command separation**: `bash .doctor/scripts/rust/verify-commands.sh src-tauri/src`
5. **Function count**: `bash .doctor/scripts/rust/verify-function-count.sh src-tauri/src`
6. **Max file size**: `bash .doctor/scripts/rust/verify-max-file-size.sh src-tauri/src`
7. **Code duplication**: `bash .doctor/scripts/rust/verify-duplicates.sh src-tauri/src`
