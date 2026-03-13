# Loqui — Features

## Core Loop

**Hold → Speak → Release → Text appears.**

Loqui's entire UX is built around one gesture: hold a global hotkey, speak naturally, release. Polished text appears wherever your cursor is — in any app, on any desktop.

---

## Feature List

### 1. Hold-to-Dictate

Press and hold a system-wide hotkey (default: `Alt+Space`) from any application. Speak naturally for as long as you want. Release the key — your words are transcribed, cleaned up, and pasted directly into the active text field.

- Works in any app: Slack, VS Code, Mail, Notion, browser, terminal — anywhere you can type
- System-level hotkey via macOS Accessibility API — works even in fullscreen apps
- Minimum 300ms hold to prevent accidental triggers
- Fully customizable key combination

### 2. Local Speech-to-Text (STT)

Loqui runs Whisper (OpenAI's speech recognition model) entirely on your machine using whisper.cpp with Metal GPU acceleration on Apple Silicon.

- **No audio ever leaves your device** — complete privacy
- 4 model tiers: Tiny (74 MB), Base (141 MB), Small (465 MB), Medium (1.46 GB)
- Tradeoff between speed and accuracy — choose the model that fits your hardware
- Multi-language support: 99 languages with auto-detection
- Models downloaded from HuggingFace, verified via SHA-256 hash

### 3. Smart Text Cleanup (LLM Refactoring)

Raw speech transcription is messy — filler words, broken grammar, run-on sentences. Loqui optionally passes transcribed text through an LLM to produce clean, ready-to-use text.

**Local LLM (no internet required):**
- Qwen3 models running on-device via llama.cpp with Metal acceleration
- 2 sizes: 1.7B (fast) and 4B (higher quality)
- Fully private — text never leaves your machine

**Remote LLM (BYOK — Bring Your Own Key):**
- OpenAI (GPT-4o, GPT-4o mini)
- Anthropic (Claude Sonnet 4, Claude Haiku 4.5)
- Google (Gemini 2.0 Flash, Gemini 2.5 Pro)
- Per-transcript cost tracking in USD
- API keys stored locally, never shared

**Graceful degradation:** If no LLM is configured or available, raw transcription is pasted as-is.

### 4. Context-Aware Profiles

Loqui detects which application you're dictating into and automatically applies the right writing style.

- **Profiles** = a named LLM system prompt + a list of associated apps
- Example: dictating in Slack → casual tone, fix grammar, keep it brief. Dictating in VS Code → technical documentation style. Dictating in Mail → formal email format with greeting and sign-off.
- Automatic app detection via macOS `NSWorkspace`
- Default profile for unmatched apps
- 5 built-in prompt templates: Casual, Professional, Technical, Email, Minimal Cleanup
- Per-profile LLM provider and model selection — use GPT-4o for important emails, a local model for quick Slack messages

### 5. Floating Widget

A tiny, always-visible indicator that shows Loqui's state at a glance.

- **Always on top** of all windows, on all virtual desktops/Spaces
- **Works in fullscreen** — rendered as an NSPanel on macOS
- **Audio-reactive** — animated equalizer bars respond to your voice while recording
- **5 states:** Idle (translucent pill), Recording (glowing border + FFT bars), Processing (wave animation), Success (green flash), Error (red flash)
- Draggable to any position on screen
- 3 size options: Small, Medium, Large
- 6 preset positions + custom drag

### 6. Direct Text Injection

When Loqui finishes processing, it doesn't just copy text — it actively types it into the focused app.

- Simulated keyboard paste via macOS CoreGraphics (`CGEventPost`)
- Optional clipboard preservation — text is injected without overwriting your clipboard
- Works in virtually any text field across the system

### 7. Transcript History

Every dictation is saved and searchable.

- Full-text search across all transcripts
- Filter by: Today, This Week, or specific app
- Raw vs. Refactored text toggle — see what you said vs. what was cleaned up
- Per-transcript metadata: app name, window title, profile used, word count, duration, words/sec
- LLM cost tracking (provider, model, tokens, cost in USD)
- Copy or delete individual transcripts
- Paginated list with infinite scroll

### 8. Dashboard & Analytics

A quick-glance view of your dictation habits.

- **Total words dictated** (all time)
- **Average words per second**
- **Total transcriptions count**
- **Time saved** (estimated vs. typing at 40 WPM)
- **Activity chart** — daily dictation volume over 7/14/30/90 days
- **Recent transcripts** — last 5 dictations with one-click access

### 9. Onboarding

A 4-step guided setup that gets users productive in under 2 minutes.

1. **Model selection** — pick a Whisper model, download with progress bar
2. **Hotkey configuration** — visual keycap UI, customize your shortcut
3. **Test dictation** — try the full pipeline end-to-end
4. **All set** — confirmation with quick reference

### 10. Settings

Fine-grained control over every aspect:

- **General:** Hotkey, clipboard behavior, launch at startup
- **Speech:** Model selection with download/swap, language selection
- **LLM:** Local model management, remote API keys, per-provider config
- **Widget:** Show/hide, position, size
- **Data:** Transcript retention (100MB–5GB or unlimited), export as JSON, clear all data
- **About:** Version, links, debug tools

---

## Privacy & Architecture

| Aspect | How Loqui handles it |
|---|---|
| Audio | Processed 100% on-device. Never uploaded. Never stored after transcription. |
| Transcription | Runs locally via whisper.cpp. No cloud STT. |
| Text cleanup | Local LLM option (llama.cpp). Remote APIs are opt-in and BYOK. |
| API keys | Stored locally in SQLite on-device. Never transmitted except for API calls. |
| Data storage | Local SQLite database. No cloud sync. No telemetry. No account required. |
| Text injection | Direct OS-level paste simulation. No intermediary service. |

---

## Platform Support

| Platform | Status |
|---|---|
| macOS (Apple Silicon) | Fully supported. GPU-accelerated via Metal. |
| macOS (Intel) | Fully supported. |
| Windows | Fully supported. |
| Linux (X11) | Fully supported. |

---

## What's Coming (Roadmap)

- Audio-reactive FFT visualization improvements
- Dark mode
- Streaming transcription (live preview while speaking)
- Multi-language auto-detection per utterance
- Voice commands ("delete that", "new paragraph")
- Custom Whisper model import
- System tray icon with quick menu
