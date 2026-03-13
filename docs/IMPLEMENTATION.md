# Loqui — Implementation Status & Plan

**Last updated:** 2026-03-13
**Tech:** Tauri 2 (Rust) + React 19 + TypeScript + Tailwind v4 + Zustand + React Router v7

---

## Conventions

- **TS/TSX files:** PascalCase (e.g. `StepWelcome.tsx`, `TauriCommands.ts`)
- **Rust files:** snake_case (standard Rust)
- **Max 500 lines per file**
- **Feature-based folder structure** (not type-based)
- Config files keep their tool-imposed names (`vite.config.ts`, etc.)

---

## Phase 1 — Scaffolding & Infrastructure ✅ DONE

### What was built:

**Backend Rust (`src-tauri/src/`):**
- `lib.rs` — Entry point, 11 Tauri commands registered, plugin setup, default profile creation
- `storage/database.rs` — SQLite init, migrations (transcripts, profiles, app_config tables), all CRUD
- `storage/transcripts.rs` — TranscriptRow struct + TranscriptStore trait
- `storage/profiles.rs` — ProfileRow struct + ProfileStore trait
- `storage/config.rs` — ConfigStore trait
- `audio/capture.rs` — Stub (Phase 2)
- `audio/types.rs` — AudioBuffer struct
- `window/` — Stubs for main_window, widget, tray (later phases)

**Frontend React/TS (`src/`):**
- `Main.tsx` — React entry, renders App
- `App.tsx` — BrowserRouter, routes to MainLayout with 4 pages
- `Index.css` — Tailwind v4 @theme with PRD design tokens
- `layout/Sidebar.tsx` — Nav with 4 items (Dashboard, Transcripts, Profiles, Settings)
- `layout/MainLayout.tsx` — Sidebar + Outlet
- `shared/components/` — 13 components: Button, Input, TextArea, Card, Toggle, Badge, KeyCap, ProgressBar, IconButton, Modal, Toast, Select, DropdownMenu
- `shared/hooks/UseTauriEvent.ts` — listen/unlisten wrapper
- `shared/hooks/UseInvoke.ts` — typed invoke with loading/error
- `shared/lib/TauriCommands.ts` — All invoke() calls typed
- `shared/lib/TauriEvents.ts` — Event names + payload types
- `shared/lib/Utils.ts` — relativeTime, formatFileSize, formatDuration, truncate
- `shared/stores/AgentStore.ts` — Zustand: agentState, audioLevel, config
- `shared/types/Transcript.ts` — Transcript, TranscriptStats, ActivityPoint
- `shared/types/Profile.ts` — Profile, parseAppMappings, PROMPT_TEMPLATES
- `shared/types/Config.ts` — AgentState, AppConfig, ModelInfo, DownloadProgress, DEFAULT_CONFIG
- `dashboard/DashboardPage.tsx` — Stub
- `transcripts/TranscriptsPage.tsx` — Stub
- `profiles/ProfilesPage.tsx` — Stub
- `settings/SettingsPage.tsx` — Stub
- `widget/WidgetApp.tsx` — Minimal widget (green dot + "Loqui", draggable, semi-transparent)

**Config:**
- `tauri.conf.json` — 2 windows (main 900x650, widget 200x44 transparent/always-on-top/all-workspaces), macOSPrivateApi enabled
- `capabilities/default.json` — Permissions for core, window, global-shortcut, clipboard, autostart, shell
- `Cargo.toml` — tauri 2 + plugins + rusqlite + uuid + chrono + dirs-next
- `package.json` — react 19 + react-router 7 + zustand 5 + recharts + lucide-react + tailwind 4

**HTML entries:**
- `index.html` → `/src/Main.tsx` (main window)
- `widget.html` → `/src/widget/WidgetApp.tsx` (widget window)

---

## Phase 2 — Onboarding (NEXT)

### Backend work:
1. **`src-tauri/src/stt/model_manager.rs`** — Model manifest (bundled JSON), download with reqwest streaming, SHA-256 verify, progress events
2. **`src-tauri/src/stt/types.rs`** — ModelInfo, DownloadStatus, TranscriptionResult
3. **`src-tauri/src/stt/whisper.rs`** — whisper-rs wrapper (load model, transcribe audio buffer)
4. **`src-tauri/src/hotkey/handler.rs`** — Register global shortcut with press/release via tauri-plugin-global-shortcut
5. **`src-tauri/src/audio/capture.rs`** — cpal microphone capture (16kHz mono PCM f32)
6. New Tauri commands: `get_models`, `download_model`, `cancel_download`, `verify_model`, `set_hotkey`
7. New events: `download-progress`, `download-complete`, `download-error`, `hotkey-state`

### Frontend work:
1. **`src/onboarding/OnboardingLayout.tsx`** — Step indicator (dots), navigation buttons, shared layout
2. **`src/onboarding/StepWelcome.tsx`** — Model grid cards (tiny/base/small/medium/large), download with ProgressBar, "Continue" button
3. **`src/onboarding/StepHotkey.tsx`** — KeyCap display of current hotkey, "Change Hotkey" button → listening mode
4. **`src/onboarding/StepTest.tsx`** — Hold hotkey prompt, text area showing transcription result
5. **`src/onboarding/StepComplete.tsx`** — "You're All Set!" with widget preview
6. Update `App.tsx` — Check `onboardingComplete` config, route to onboarding or dashboard

### Cargo.toml additions needed:
- `whisper-rs` with coreml+metal features
- `cpal` for audio
- `reqwest` with stream feature
- `sha2` for hash verification

---

## Phase 3 — Core Agent Pipeline

- `agent/pipeline.rs` — Full orchestrator: hotkey press → audio capture → release → transcribe → resolve profile → LLM refactor → paste
- `agent/state.rs` — State machine (Idle → Recording → Processing → Success/Error → Idle)
- `activeapp/detector.rs` — active-win-pos-rs wrapper
- `paste/injector.rs` — clipboard write + enigo Cmd+V simulation
- `storage/transcripts.rs` — Save transcript after each dictation
- Wire hotkey handler to pipeline

## Phase 4 — Widget

- `widget/WidgetApp.tsx` — Full state-based rendering (idle/recording/processing/success/error)
- `widget/WidgetIdle.tsx` — Semi-transparent, breathing animation
- `widget/WidgetRecording.tsx` — Audio-reactive FFT bars, red accent
- `widget/WidgetProcessing.tsx` — Spinner animation
- `widget/WidgetFeedback.tsx` — Green checkmark (success) or red X (error), brief flash
- Listen to `agent-state-changed` and `audio-level` events

## Phase 5 — Dashboard & Transcripts

- `dashboard/DashboardPage.tsx` — Full implementation with stats
- `dashboard/StatsRow.tsx` — 4 stat cards (total words, avg w/s, total transcripts, time saved)
- `dashboard/ActivityChart.tsx` — recharts bar chart (daily/weekly/monthly)
- `dashboard/RecentTranscripts.tsx` — Last 5 transcripts
- `transcripts/TranscriptsPage.tsx` — Two-panel layout
- `transcripts/TranscriptList.tsx` — Scrollable list with search
- `transcripts/TranscriptItem.tsx` — App icon, preview, timestamp, 3-dot menu
- `transcripts/TranscriptDetail.tsx` — Full detail, raw/refactored toggle, actions
- `transcripts/TranscriptFilters.tsx` — Search bar + filter chips (All, Today, This Week, by App)

## Phase 6 — Profiles & LLM

- `profiles/ProfilesPage.tsx` — Two-panel
- `profiles/ProfileList.tsx` — Profile list with "New Profile" button
- `profiles/ProfileEditor.tsx` — Name, system prompt, template presets, app mappings, test area
- `profiles/AppMappingPicker.tsx` — Searchable app picker
- `llm/provider.rs` — LlmProvider trait
- `llm/remote.rs` — OpenAI/Anthropic/Google HTTP clients
- Profile resolution in agent pipeline

## Phase 7 — Settings

- All settings sections (General, Speech, LLM, Widget, Data, About)
- `settings/GeneralSection.tsx` — Hotkey, startup, auto-paste, sounds
- `settings/SpeechSection.tsx` — Model, language
- `settings/LlmSection.tsx` — Provider, API key, model
- `settings/WidgetSection.tsx` — Show, position, size, style
- `settings/DataSection.tsx` — Retention, export, clear
- `settings/AboutSection.tsx` — Version, links

## Phase 8 — Polish

- `window/tray.rs` — TrayIconBuilder + menu ("Show Dashboard" / "Quit")
- Launch at startup (tauri-plugin-autostart)
- Notification sounds
- Error handling
- macOS permissions flow
- Real app icon

---

## IPC Contract (Commands)

| Command | Status |
|---------|--------|
| `get_config` | ✅ |
| `set_config` | ✅ |
| `get_transcripts` | ✅ |
| `get_transcript` | ✅ |
| `delete_transcript` | ✅ |
| `get_transcript_stats` | ✅ |
| `get_profiles` | ✅ |
| `get_profile` | ✅ |
| `save_profile` | ✅ |
| `delete_profile` | ✅ |
| `clear_all_data` | ✅ |
| `get_models` | Phase 2 |
| `download_model` | Phase 2 |
| `cancel_download` | Phase 2 |
| `verify_model` | Phase 2 |
| `set_hotkey` | Phase 2 |
| `get_detected_apps` | Phase 3 |
| `test_refactor` | Phase 6 |
| `open_main_window` | Phase 8 |
| `export_transcripts` | Phase 7 |

---

## SQLite Schema (implemented)

```sql
transcripts (id, raw_text, refactored_text, app_name, window_title, profile_id, profile_name, word_count, duration, words_per_second, status, error_message, created_at)
profiles (id, name, system_prompt, app_mappings, is_default, created_at, updated_at)
app_config (key, value)
```
