---
created_at: 2026-04-11T16:58:36.389157+00:00
updated_at: 2026-04-20T20:42:50.955127+00:00
category: project_memory
source: dream
tags: ["scrmflow", "architecture"]
---

# ScrmFlow overview

ScrmFlow is a privacy-focused speech-to-text desktop companion supporting both local (on-device) and cloud transcription modes.

**What it does:** Captures microphone audio and transcribes speech. Supports fully local Whisper models (audio never leaves device) OR cloud STT providers (Groq whisper-large-v3-turbo, OpenAI, Deepgram, Custom OpenAI-compatible endpoints). Provides a floating overlay widget and a full dashboard.

**Stack:** Tauri 2 (Rust backend) + React 19 + TypeScript + Tailwind v4 + Zustand + React Router v7. SQLite for local storage.

**Two-window architecture:**
- `index.html` → main dashboard (settings, transcripts, profiles)
- `widget.html` → floating NSPanel overlay that works over fullscreen apps on macOS

**Bundle ID:** `com.impulselab.loqui`

**API key storage:** Provider API keys (LLM + STT) stored in `secrets` SQLite table, AES-256-GCM encrypted. Master key file at `~/Library/Application Support/com.impulselab.loqui/master.key` (perms 0600, generated at first boot). NOT in OS keychain.

**Key modules (as of 2026-04-20):**
- `src-tauri/src/security/secrets.rs` — `MasterKey::load_or_create()`, `encrypt()`, `decrypt()`. Format: `hex(nonce || ciphertext)`
- `src-tauri/src/storage/secrets.rs` — `SecretStore` trait, `secrets(account, value)` DB table
- `src-tauri/src/stt/dispatch.rs` — routes transcription to local Whisper or remote based on `sttProvider` config
- `src-tauri/src/stt/remote.rs` — async `remote_transcribe()` for cloud providers (multipart/form-data audio upload)
- `src-tauri/src/commands/stt_cloud.rs` — IPC: `save_stt_api_key`, `has_stt_api_key`, `delete_stt_api_key`, `test_stt_provider`
- `src-tauri/src/commands/llm_keys.rs` — IPC: same pattern for LLM keys
- `src/shared/components/cloud-provider-picker/` — shared picker used in onboarding + settings

**Onboarding step-welcome split (as of 2026-04-20):**
- `step-welcome.tsx` — orchestrator (toggles local/cloud mode, default = local)
- `step-welcome-local.tsx` — Whisper model cards UI
- `step-welcome-cloud.tsx` — cloud provider picker UI
- Both sub-steps have a link to switch to the other mode

**Onboarding step order:** Permissions (0) → Model (1) → Microphone (2) → Hotkey (3) → Test (4) → Done (5)
