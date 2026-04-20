---
created_at: 2026-04-20T17:00:48.502217+00:00
updated_at: 2026-04-20T20:42:51.603217+00:00
category: project_memory
source: dream
tags: ["scrmflow", "architecture", "decisions"]
---

# ScrmFlow cloud STT architecture decisions

**API keys stored in encrypted SQLite, NOT OS keychain:** `secrets` table, AES-256-GCM via `aes-gcm = "0.10"` + `rand = "0.8"`. Master key file `master.key` in app data dir, perms 0600. This is OS-agnostic and avoids macOS permission prompts for every keychain access. keyring crate removed entirely.

**`<select>` HTML elements forbidden in settings/onboarding:** Always use `<Select>` shared component for consistent dropdown styling. Added `fullWidth: boolean` prop for form/column layouts. Never use native `<select>`.

**Speech settings UI grouping:** Transcription mode toggle + model selector are in ONE Card with `divide-y` rows — visually indicates they belong together. Microphone selector is a separate Card. Model row shown conditionally (local model name OR cloud provider/model picker).

**cloud-provider-picker layout:** Lives in `src/shared/components/cloud-provider-picker/`. Provider row + model row are visually grouped with NO internal Card wrapper — settings page uses its own Card, onboarding wraps it in its own Card.

**Onboarding default:** Always starts in local mode — never reads `sttProvider` config on mount. Cloud option accessible via link inside the step.

**Permissions step skip:** Pre-checked in `onboarding-layout.tsx` BEFORE any mount. If all 3 permissions granted → step filtered out of `stepSequence` entirely → never rendered. Short "Loading…" state during initial check. The step itself does NOT self-skip — the layout handles filtering.

**Permissions step behavior:** 3 rows (mic, accessibility, input-monitoring). Grant button per row → disabled 'Granted' once done. Continue button disabled until all granted. Re-checks after 1.5s on denial (System Settings async). macOS permission wrappers return `false` on error (NOT `true`) — avoids silent skip.

**Offline/API error:** No silent fallback to local. Cloud errors propagate to frontend as explicit errors → toast.

**Save order in `cloud-provider-picker`:** model + endpoint saved *before* `sttProvider` flag — prevents half-initialized state.

**switchToLocal clears** `sttRemoteModel` and `sttCustomEndpoint` — no stale cloud config leaking.

**sttLanguage propagated** to both local Whisper path and remote `dispatch::transcribe`.

**Language section removed** from speech settings UI (redundant).

**Provider list source of truth:** Two separate arrays (frontend `src/settings/speech/remote-provider-config.ts` for speech, `src/settings/llm/remote-provider-config.ts` for LLM). Minor duplication accepted.

**Groq model default:** `whisper-large-v3-turbo`.

**reqwest feature flags:** `multipart` + `json` required in `Cargo.toml` for cloud STT calls.

**LLM key migration REVERTED:** One-shot boot migration was planned but removed. Pre-existing LLM keys in `app_config` DB rows stay orphaned. Encrypted `secrets` table used ONLY for newly entered keys. `delete_config` removed from ConfigStore trait.
