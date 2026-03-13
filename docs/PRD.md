# Loqui — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-12
**Author:** Impulse Lab

---

## 1. Vision & Elevator Pitch

Loqui is a local-first, always-on speech-to-text desktop companion. You hold a hotkey, speak naturally, release — and polished text appears wherever your cursor is. A persistent floating widget lives on top of all windows across all desktops, showing recording state in real-time. The main window is purely a settings & history dashboard that can be opened and closed without interrupting the agent.

Core loop: **Hold hotkey → Speak → Release → Transcribe → (optional) LLM refactor → Paste into active app.**

---

## 2. Target Platforms

MVP: macOS (Apple Silicon priority), Windows.
Future: Linux.
Tech consideration: Expo (React Native) for portability, or Tauri 2 / Electron. The PRD is stack-agnostic — it describes features, flows, and UI, not implementation.

---

## 3. Core Concepts

| Concept | Definition |
|---|---|
| **Agent** | The background process that runs 24/7 while the app is installed. Listens for the hotkey, records audio, transcribes, refactors, and pastes. Independent of the main window. |
| **Widget** | A small always-on-top floating UI element (on all desktops) showing agent status. Semi-transparent when idle, fully visible when recording. |
| **Main Window** | The settings/dashboard window. Opening it = customization. Closing it does NOT stop the agent. |
| **Profile** | A named LLM system prompt + list of app mappings. Determines how raw transcription is refactored before pasting. |
| **App Mapping** | An association between a detected foreground application (e.g. "Slack", "VS Code") and a Profile. When the user dictates while that app is focused, the mapped profile's prompt is used. |
| **Transcript** | A recorded dictation event. Stores: raw STT text, refactored text, detected app, profile used, timestamp, word count, duration. |

---

## 4. Feature Breakdown

### 4.1 — Model Management

**What:** Download, verify, and manage local Whisper STT models.

**Behavior:**

- On first launch (or if no valid model is found), the onboarding flow presents model selection.
- Available models: `tiny`, `base`, `small`, `medium`, `large-v3` (Whisper GGML / CoreML variants depending on platform).
- Each model shows: name, size on disk, expected accuracy tier (low/medium/high/very high), and estimated download time.
- Selecting a model triggers download with a real progress bar (bytes downloaded / total, percentage, speed).
- Models are stored in a well-known app data directory (e.g. `~/.loqui/models/`).
- On re-launch, if a model file already exists, its integrity is verified via SHA-256 hash comparison against a bundled manifest. If valid → skip download. If corrupted → re-download.
- If the user quits mid-download and re-opens the app, the partial file is detected. The app re-verifies the hash — if it fails, it restarts the download (or resumes if the server supports HTTP Range requests).
- The user can change models later from Settings without re-doing onboarding.
- Future: support for multiple concurrent models, custom GGML models via file import.

**Model manifest (bundled or fetched):**
```
{
  "models": [
    {
      "id": "whisper-base",
      "name": "Base",
      "fileName": "ggml-base.bin",
      "size": 148000000,
      "sha256": "...",
      "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
      "accuracyTier": "medium",
      "description": "Good balance of speed and accuracy"
    }
  ]
}
```

---

### 4.2 — Transcription Pipeline

**What:** The core record → transcribe → refactor → paste loop.

**Flow:**

1. User presses and **holds** the configured hotkey (default: `Shift+Option` on Mac, `Shift+Alt` on Windows).
2. The agent immediately:
   - Detects the currently focused application (app name + window title).
   - Starts capturing microphone audio into a buffer (16kHz mono PCM).
   - Transitions the widget to "recording" state.
3. While the user holds:
   - Audio is continuously buffered.
   - The widget reacts in real-time (see Widget section).
4. User **releases** the hotkey.
   - Recording stops.
   - Widget transitions to "processing" state (spinner/loading animation).
   - Audio buffer is sent to the local Whisper model for transcription.
5. Raw transcription is obtained.
6. If a Profile is mapped to the detected app (or a default profile exists):
   - The raw text is sent through the LLM refactor step using the profile's system prompt.
   - LLM can be local (llama.cpp, MLX) or remote (OpenAI, Anthropic, Google — BYOK).
   - If no LLM is configured or no profile applies: raw text is used as-is.
7. Final text is pasted into the previously focused application via clipboard injection (copy to clipboard → simulate Cmd+V / Ctrl+V).
8. Widget returns to idle state.
9. A Transcript record is saved.

**Edge cases:**
- Very short press (<300ms): ignore, don't transcribe silence.
- No microphone permission: show OS permission prompt on first use, show error in widget if denied.
- Transcription error: widget shows brief error flash, transcript is saved with error flag.
- No internet + remote LLM configured: fall back to raw transcription, notify user.

---

### 4.3 — Hotkey System

**What:** A global, system-wide keyboard shortcut that works regardless of focused application.

**Behavior:**
- Default: `Shift+Option` (Mac) / `Shift+Alt` (Windows).
- Must detect both **press** and **release** events (not just a toggle).
- Registered at OS level so it captures input even when Loqui is not focused.
- Configurable in onboarding (step 2) and in Settings.
- Hotkey change UI: shows realistic keyboard key caps (not text badges). User clicks "Change" → enters listening mode → presses new combo → confirms.
- Conflicts: if the hotkey is already registered by another app, show a warning and suggest alternatives.

---

### 4.4 — Floating Widget (Always-on Agent Indicator)

**What:** A small floating UI element that is always visible on screen, on all desktops/spaces.

**Properties:**
- Always on top of all windows.
- Present on all virtual desktops / Spaces.
- Draggable to any screen edge or position (persists position across restarts).
- Cannot be accidentally closed (no close button — only hideable from Settings).
- Future: customizable position presets (bottom-left, bottom-right, center-bottom, etc.).

**States:**

| State | Visual | Behavior |
|---|---|---|
| **Idle** | Semi-transparent (~40% opacity), small pill or circle. Subtle breathing animation or static. | Waiting for hotkey. Shows Loqui icon. |
| **Recording** | Fully opaque, expanded slightly. Audio-reactive: FFT visualization, pulsing rings, color shifts, or growing/shrinking based on input amplitude. | User is speaking. |
| **Processing** | Fully opaque, spinner or morphing animation replacing FFT. | Transcription + LLM refactor in progress. |
| **Success** | Brief green flash or checkmark, then returns to idle. | Text was pasted successfully. |
| **Error** | Brief red flash or X icon, then returns to idle. | Something failed. |

**Audio-reactive ideas for recording state (pick one or prototype several):**
- Concentric rings that pulse with amplitude.
- A waveform bar (mini FFT) inside the pill.
- The pill "breathes" (scales up/down) with voice volume.
- Color gradient shifts from cool (quiet) to warm (loud).
- Particle effect that intensifies with volume.

---

### 4.5 — Onboarding Flow

A linear, 4-step flow shown on first launch (or if setup is incomplete).

**Skip logic:** If the user has already completed onboarding (has a valid model + at least one profile), skip directly to the main app.

#### Step 1 — Welcome + Model Selection

- Title: "Welcome to Loqui"
- Subtitle: "Choose a speech recognition model to get started."
- Grid/list of available models, each as a card showing: model name, size, accuracy tier, short description.
- Selecting a model starts the download immediately.
- Progress bar with: percentage, MB downloaded / total MB, estimated time remaining.
- If model already downloaded & hash valid: card shows "Downloaded ✓", selecting it skips download.
- "Continue" button activates once download completes.
- If user quits mid-download: next launch returns to Step 1, detects partial file, re-verifies or re-downloads.

#### Step 2 — Hotkey Configuration

- Title: "Set Your Hotkey"
- Subtitle: "Hold this key combination to start dictating."
- Large visual of current hotkey as realistic 3D/skeuomorphic keyboard keys (e.g. two key caps showing `⇧ Shift` and `⌥ Option`).
- Below: "Change Hotkey" button → enters listening mode → captures next key combo → shows preview → confirm/cancel.
- "Continue" button always active (default hotkey is pre-set).

#### Step 3 — Test Dictation

- Title: "Try It Out"
- Subtitle: "Hold your hotkey and say something."
- A large text area in the center showing a prompt like: "Hold `Shift+Option` and say anything..."
- When the user holds the hotkey and speaks, the transcribed text appears in real-time (or after release) in the text area.
- This serves as both a test AND the "all set" confirmation.
- "Continue" button unlocks once any text has been transcribed (non-empty).
- This replaces the old "profile creation" step — the default profile is `casual` (auto-created, no user input needed).

#### Step 4 — All Set

- Title: "You're All Set!"
- Subtitle: "Loqui is running in the background. Hold your hotkey anywhere to dictate."
- Visual: the floating widget preview, showing how it will look on their screen.
- "Get Started" button → closes onboarding, opens main window, activates the agent + widget.

---

### 4.6 — Main Window (Settings & Dashboard)

The main window is the "home base" for customization. **Closing it does NOT stop the agent.** The agent + widget continue running in the background.

#### Layout

- **Left sidebar:** Navigation with sections: Dashboard, Transcripts, Profiles, Settings.
- **Main content area:** Renders the selected section.
- No title bar clutter — clean, minimal. App name in sidebar header with a small status indicator (green dot = agent active).

---

### 4.7 — Dashboard Page

The default page when opening the main window.

**Content:**

- **Quick stats row (cards):**
  - Total words dictated (all time).
  - Words per second (average across all transcripts).
  - Total transcriptions count.
  - Time saved estimate (words dictated / average typing speed of 40 WPM → minutes saved).

- **Activity chart:**
  - A simple bar or area chart showing dictation volume over time (daily, weekly, monthly toggle).
  - X-axis: time. Y-axis: word count or transcript count.

- **Recent transcripts:**
  - Last 5 transcripts as a compact list (timestamp, app icon, first line preview, word count).
  - Click → navigates to Transcripts page with that item selected.

- **Quick actions:**
  - "Change Model" shortcut.
  - "Edit Default Profile" shortcut.

---

### 4.8 — Transcripts Page

**Layout:** Two-panel. Left = transcript list. Right = transcript detail.

#### Left Panel — Transcript List

- Scrollable list of all transcripts, newest first.
- Each item shows:
  - App icon (detected application) — left side.
  - First line / preview of the transcript text — center.
  - Timestamp (relative: "2m ago", "Yesterday 3:42 PM") — right side.
  - Three-dot menu icon (far right) for actions.
- Search bar at the top to filter transcripts by text content.
- Filter chips: All, Today, This Week, by App.

#### Right Panel — Transcript Detail

- Shows the full transcript when an item is selected from the list.
- **Header:** App name + icon, timestamp, profile used, duration, word count.
- **Transcript body:** The full refactored text. If the text is long (>5 lines), it's collapsed with a "Show more" button that expands it smoothly.
- **Raw vs Refactored toggle:** A small toggle or tabs to switch between the raw STT output and the LLM-refactored version.
- **Actions bar (bottom or top-right):**
  - Copy to clipboard.
  - Delete transcript.
  - "Create Profile for [App Name]" — quick action to create a new profile pre-mapped to this transcript's detected app.
  - Re-process (re-run LLM refactor with a different profile).

#### Three-dot menu actions (on list items):

- Copy text.
- Delete.
- Create Profile for [App Name].
- View details (same as clicking the item).

---

### 4.9 — Profiles Page

**Layout:** Two-panel. Left = profile list. Right = profile editor.

#### Left Panel — Profile List

- List of all profiles.
- Default profile ("Casual") is always first, with a "Default" badge.
- Each item shows: profile name, number of mapped apps, last edited date.
- "New Profile" button at the top.

#### Right Panel — Profile Editor

When a profile is selected (or "New Profile" is clicked):

- **Profile Name** — text input.
- **System Prompt** — large text area. This is the LLM instruction that transforms raw transcription.
  - Placeholder with helpful example: "You are a text refactoring assistant. Clean up the following dictated text: fix grammar, remove filler words, keep the original meaning and tone."
  - Template presets dropdown: Casual, Technical, Email, Social Media, Code Comments, Meeting Notes.
- **App Mappings** — a list of associated applications.
  - Each mapping shows: app icon + app name + remove button.
  - "Add App" button → opens a searchable picker showing recently detected apps (from transcript history).
  - Manual entry option: type an app name/bundle ID.
- **Test area** — a small "Try this profile" section:
  - Text input to paste or type sample text.
  - "Refactor" button → runs the text through the profile's prompt → shows result.
- **Save / Delete buttons.**

**Profile resolution logic (for the agent):**
1. User releases hotkey → app is detected (e.g. "Slack").
2. Check all profiles for an app mapping matching "Slack".
3. If found → use that profile's system prompt.
4. If not found → use the default profile.
5. If no default profile → paste raw transcription.

---

### 4.10 — Settings Page

Organized into sections (collapsible or tabbed):

#### General
- **Hotkey:** Current hotkey displayed as key caps. "Change" button.
- **Launch at startup:** Toggle.
- **Auto-paste:** Toggle (if off, text goes to clipboard only, no simulated paste).
- **Notification sounds:** Toggle (play a subtle sound on transcription complete).

#### Speech Recognition
- **Current model:** Name + size. "Change Model" button → re-opens model picker (not full onboarding, just the model selection + download UI).
- **Language:** Dropdown (Auto-detect, English, French, Spanish, etc.). Maps to Whisper's `--language` flag.

#### LLM Refactoring
- **Provider:** Local / OpenAI / Anthropic / Google / Custom.
- If Local: model path picker or bundled model selector.
- If Remote: API key input (stored securely in OS keychain), model name dropdown.
- **Enable refactoring:** Master toggle. If off, raw transcription is always pasted (no LLM step).

#### Widget
- **Show widget:** Toggle.
- **Widget position:** Preset selector (bottom-left, bottom-right, bottom-center, top-left, top-right, top-center) + "Custom" (remembers last drag position).
- **Widget size:** Small / Medium / Large.
- **Widget style:** Minimal (just a dot) / Standard (pill with icon) / Expressive (full FFT animation).

#### Data
- **Transcript storage:** Keep forever / Keep 30 days / Keep 7 days / Don't store.
- **Export transcripts:** Button → exports all transcripts as JSON or CSV.
- **Clear all data:** Destructive action with confirmation dialog.

#### About
- Version number, links to website, changelog, licenses.

---

## 5. Design System

### Brand Identity

| Property | Value |
|---|---|
| App Name | Loqui |
| Personality | Fast, minimal, professional, invisible when you don't need it |
| Design Philosophy | The app should feel like it doesn't exist until you need it |

### Colors

**Light mode only (MVP).**

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#FAFAF8` | App background, main surfaces |
| `--bg-secondary` | `#F2F2EF` | Cards, sidebar, secondary surfaces |
| `--bg-tertiary` | `#E8E8E4` | Hover states, dividers |
| `--text-primary` | `#1A1A18` | Headings, primary text |
| `--text-secondary` | `#6B6B66` | Descriptions, secondary text |
| `--text-tertiary` | `#9B9B96` | Placeholders, disabled text |
| `--accent` | `#2563EB` | Primary actions, links, active states |
| `--accent-hover` | `#1D4ED8` | Hover on accent elements |
| `--accent-subtle` | `#EFF6FF` | Accent backgrounds, selected states |
| `--success` | `#16A34A` | Success states, active indicators |
| `--error` | `#DC2626` | Error states, destructive actions |
| `--warning` | `#F59E0B` | Warning states |
| `--recording` | `#EF4444` | Recording state (widget, indicators) |
| `--border` | `#E5E5E0` | Borders, separators |

### Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Headings (H1) | DM Sans | 600 (SemiBold) | 24px |
| Headings (H2) | DM Sans | 600 | 20px |
| Headings (H3) | DM Sans | 500 (Medium) | 16px |
| Body | DM Sans | 400 (Regular) | 14px |
| Body Small | DM Sans | 400 | 13px |
| Caption | DM Sans | 400 | 12px |
| Monospace (code, stats) | DM Mono | 400 | 13px |
| Keyboard keys | DM Sans | 500 | 12px |

### Spacing

Base unit: 4px. Common values: 4, 8, 12, 16, 20, 24, 32, 40, 48.

### Border Radius

| Element | Radius |
|---|---|
| Buttons, inputs | 8px |
| Cards, panels | 12px |
| Modals, sheets | 16px |
| Widget (pill) | 999px (full round) |
| Keyboard key caps | 6px |

### Shadows

Minimal. Only for floating elements:
- Widget: `0 2px 12px rgba(0,0,0,0.12)`
- Modals: `0 4px 24px rgba(0,0,0,0.08)`
- Cards: `0 1px 3px rgba(0,0,0,0.04)` (subtle, almost flat)

### Component Library

| Component | Notes |
|---|---|
| Button | Primary (accent fill), Secondary (ghost/outline), Destructive (red). Sizes: sm, md, lg. |
| Input | Single line text. Label above, placeholder inside. Optional left/right icon. |
| TextArea | Multi-line. Auto-grows up to a max height, then scrolls. |
| Select/Dropdown | Native-feeling. Label above. |
| Toggle | iOS-style toggle switch with label. |
| Card | Flat surface with subtle border. Optional `featured` state with accent border. |
| KeyCap | Renders a keyboard key with 3D-ish styling (slight gradient, border, shadow). Used for hotkey display. |
| ProgressBar | Thin horizontal bar with accent fill. Shows percentage. |
| Badge | Small label (e.g., "Default", app name). Rounded, muted background. |
| IconButton | Round, icon-only. For actions like delete, menu, close. |
| Sidebar | Fixed left, full height. Items with icons + labels. Active state with accent background. |
| Three-dot menu | Dropdown with action items. Triggered by `...` icon button. |
| Modal/Dialog | Centered overlay with backdrop blur. For confirmations, pickers. |
| Toast | Bottom-right notification for quick feedback (copied, deleted, error). |

---

## 6. Page-by-Page UI Specifications

### 6.1 — Onboarding: Step 1 (Welcome + Model)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [Loqui Logo/Icon]                 │
│                                                  │
│           Welcome to Loqui                    │
│   Choose a speech recognition model              │
│   to get started.                                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Tiny    │  │  Base ✓  │  │  Small   │       │
│  │  75 MB   │  │  148 MB  │  │  488 MB  │       │
│  │  Low     │  │  Medium  │  │  High    │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│  ┌──────────┐  ┌──────────┐                      │
│  │  Medium  │  │  Large   │                      │
│  │  1.5 GB  │  │  3.1 GB  │                      │
│  │  High    │  │  Best    │                      │
│  └──────────┘  └──────────┘                      │
│                                                  │
│  ┌──────────────────────────────────────┐        │
│  │ ████████████░░░░░░░░  62%  92 MB/148 │        │
│  │ Downloading Base model...   ~12s     │        │
│  └──────────────────────────────────────┘        │
│                                                  │
│                         [ Continue → ]           │
│                                                  │
│  ● ○ ○ ○     Step 1 of 4                        │
└──────────────────────────────────────────────────┘
```

### 6.2 — Onboarding: Step 2 (Hotkey)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Set Your Hotkey                       │
│   Hold this combination to start dictating.      │
│                                                  │
│                                                  │
│          ┌─────────┐   ┌─────────┐               │
│          │         │   │         │               │
│          │  ⇧      │   │  ⌥      │               │
│          │  Shift  │   │  Option │               │
│          │         │   │         │               │
│          └─────────┘   └─────────┘               │
│                                                  │
│            [ Change Hotkey ]                     │
│                                                  │
│   Hold both keys together to start recording.    │
│   Release to stop and transcribe.                │
│                                                  │
│                         [ Continue → ]           │
│                                                  │
│  ● ● ○ ○     Step 2 of 4                        │
└──────────────────────────────────────────────────┘
```

### 6.3 — Onboarding: Step 3 (Test Dictation)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Try It Out                            │
│   Hold your hotkey and say something.            │
│                                                  │
│  ┌──────────────────────────────────────┐        │
│  │                                      │        │
│  │  Hold  ⇧ Shift + ⌥ Option           │        │
│  │  and say anything...                 │        │
│  │                                      │        │
│  │  "Hello, this is my first test       │        │
│  │   of Loqui and it works           │        │
│  │   perfectly."                        │        │
│  │                                      │        │
│  └──────────────────────────────────────┘        │
│                                                  │
│                         [ Continue → ]           │
│                                                  │
│  ● ● ● ○     Step 3 of 4                        │
└──────────────────────────────────────────────────┘
```

### 6.4 — Onboarding: Step 4 (All Set)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            You're All Set!                       │
│   Loqui is running in the background.         │
│   Hold your hotkey anywhere to dictate.          │
│                                                  │
│          ┌───────────────────┐                    │
│          │  ◉  Loqui      │  ← widget preview │
│          └───────────────────┘                    │
│                                                  │
│   The floating indicator shows when Loqui     │
│   is listening. You can customize it in          │
│   Settings.                                      │
│                                                  │
│                      [ Get Started → ]           │
│                                                  │
│  ● ● ● ●     Step 4 of 4                        │
└──────────────────────────────────────────────────┘
```

### 6.5 — Main Window: Dashboard

```
┌────────────┬─────────────────────────────────────┐
│            │                                     │
│  ◉ Loqui│  Dashboard                          │
│            │                                     │
│  ■ Dashboard│  ┌─────────┐ ┌─────────┐ ┌────────┐│
│  □ Scripts │  │ 12,482  │ │  2.3    │ │  847   ││
│  □ Profiles│  │ words   │ │ w/sec   │ │ total  ││
│  □ Settings│  │ total   │ │ avg     │ │ trans. ││
│            │  └─────────┘ └─────────┘ └────────┘│
│            │  ┌─────────┐                        │
│            │  │  ~5h    │                        │
│            │  │  saved  │                        │
│            │  └─────────┘                        │
│            │                                     │
│            │  Activity (This Week)               │
│            │  ┌─────────────────────────────┐    │
│            │  │ ▃ █ ▅ ▇ ▂ ▆ ▄              │    │
│            │  │ M T W T F S S              │    │
│            │  └─────────────────────────────┘    │
│            │                                     │
│            │  Recent Transcripts                 │
│            │  ┌─────────────────────────────┐    │
│            │  │ 🟢 Slack  "Hey team, jus…" 2m │  │
│            │  │ 🔵 VSCode "// TODO: ref…" 15m│   │
│            │  │ 🟢 Slack  "Sounds good…"  1h │   │
│            │  └─────────────────────────────┘    │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### 6.6 — Main Window: Transcripts

```
┌────────────┬──────────────────┬──────────────────┐
│            │  🔍 Search...    │                  │
│  ◉ Loqui│  All Today Week  │  Slack           │
│            │                  │  2 min ago       │
│  □ Dashboard│  ┌──────────────┐│  Profile: Casual │
│  ■ Scripts │  │🟢 Slack      ││  128 words · 4s  │
│  □ Profiles│  │"Hey team..." ││                  │
│  □ Settings│  │2m ago    ⋯   ││  ─────────────── │
│            │  ├──────────────┤│                  │
│            │  │🔵 VS Code   ││  Hey team, just  │
│            │  │"// TODO..."  ││  wanted to let   │
│            │  │15m ago   ⋯   ││  you know that   │
│            │  ├──────────────┤│  the deployment  │
│            │  │🟢 Slack      ││  went smoothly   │
│            │  │"Sounds goo." ││  and everything  │
│            │  │1h ago    ⋯   ││  is looking good │
│            │  ├──────────────┤│  on production.  │
│            │  │🟣 Notion     ││                  │
│            │  │"Meeting no." ││  [ Show more ]   │
│            │  │3h ago    ⋯   ││                  │
│            │  └──────────────┘│  ─────────────── │
│            │                  │  Raw | Refactored│
│            │                  │                  │
│            │                  │  📋 Copy  🗑 Del │
│            │                  │  + Profile for   │
│            │                  │    Slack          │
└────────────┴──────────────────┴──────────────────┘
```

### 6.7 — Main Window: Profiles

```
┌────────────┬──────────────────┬──────────────────┐
│            │                  │                  │
│  ◉ Loqui│  [ + New Profile ]│ Profile: Casual  │
│            │                  │  DEFAULT         │
│  □ Dashboard│  ┌──────────────┐│                  │
│  □ Scripts │  │ Casual    ✦  ││ Name             │
│  ■ Profiles│  │ 3 apps       ││ ┌──────────────┐ │
│  □ Settings│  ├──────────────┤│ │ Casual        │ │
│            │  │ Technical    ││ └──────────────┘ │
│            │  │ 2 apps       ││                  │
│            │  ├──────────────┤│ System Prompt    │
│            │  │ Email        ││ Template: [Casual ▾]│
│            │  │ 1 app        ││ ┌──────────────┐ │
│            │  └──────────────┘│ │ Keep the      │ │
│            │                  │ │ natural tone  │ │
│            │                  │ │ but fix       │ │
│            │                  │ │ grammar...    │ │
│            │                  │ └──────────────┘ │
│            │                  │                  │
│            │                  │ App Mappings     │
│            │                  │ ┌──────────────┐ │
│            │                  │ │ 🟢 Slack   ✕ │ │
│            │                  │ │ 🟣 Notion  ✕ │ │
│            │                  │ │ 💬 iMsg    ✕ │ │
│            │                  │ │ [ + Add App ] │ │
│            │                  │ └──────────────┘ │
│            │                  │                  │
│            │                  │ [ Save ] [Delete]│
└────────────┴──────────────────┴──────────────────┘
```

### 6.8 — Floating Widget States

```
Idle (semi-transparent):
    ╭──────────────╮
    │  ◉  Loqui │      opacity: 40%
    ╰──────────────╯

Recording (fully visible, audio-reactive):
    ╭────────────────────╮
    │  ● ▁▃▅▇▅▃▁ 0:03  │      red accent, FFT bars
    ╰────────────────────╯

Processing (spinner):
    ╭──────────────────╮
    │  ◌ Processing... │      accent color, spinner
    ╰──────────────────╯

Success (brief flash):
    ╭──────────────╮
    │  ✓  Pasted   │      green, fades to idle
    ╰──────────────╯
```

---

## 7. Data Model (Logical — stack-agnostic)

### Transcript
```
id:            string (UUID)
rawText:       string
refactoredText: string | null
appName:       string
windowTitle:   string
profileId:     string | null
profileName:   string | null
wordCount:     number
duration:      number (seconds, recording duration)
wordsPerSecond: number (computed: wordCount / duration)
status:        "success" | "error"
errorMessage:  string | null
createdAt:     ISO 8601 datetime
```

### Profile
```
id:            string (UUID)
name:          string
systemPrompt:  string
appMappings:   string[] (app bundle IDs or names)
isDefault:     boolean
createdAt:     ISO 8601 datetime
updatedAt:     ISO 8601 datetime
```

### AppConfig
```
hotkey:             string (e.g. "shift+option")
defaultProfileId:   string
sttModel:           string (model ID from manifest)
sttLanguage:        string ("auto" | "en" | "fr" | ...)
llmProvider:        "local" | "openai" | "anthropic" | "google" | "custom"
llmApiKey:          string (encrypted/keychain)
llmModel:           string
llmEnabled:         boolean
autoPaste:          boolean
launchAtStartup:    boolean
notificationSounds: boolean
widgetVisible:      boolean
widgetPosition:     { x: number, y: number } | "bottom-left" | "bottom-right" | ...
widgetSize:         "small" | "medium" | "large"
widgetStyle:        "minimal" | "standard" | "expressive"
transcriptRetention: "forever" | "30d" | "7d" | "none"
onboardingComplete: boolean
```

### ModelManifest (bundled)
```
models: Array<{
  id:           string
  name:         string
  fileName:     string
  size:         number (bytes)
  sha256:       string
  url:          string
  accuracyTier: "low" | "medium" | "high" | "very-high"
  description:  string
}>
```

---

## 8. Agent Lifecycle

```
App Launch
  │
  ├─ Is onboarding complete?
  │    ├─ No → Show onboarding flow
  │    └─ Yes → Start agent + widget, open main window
  │
  ├─ Agent starts:
  │    ├─ Load config from persistent storage
  │    ├─ Load Whisper model into memory
  │    ├─ Register global hotkey
  │    ├─ Show floating widget (idle state)
  │    └─ Begin listening for hotkey events
  │
  ├─ Main window opened:
  │    └─ Render dashboard. Agent continues running.
  │
  ├─ Main window closed:
  │    └─ Agent + widget continue running.
  │         System tray icon remains.
  │
  ├─ Hotkey pressed:
  │    ├─ Widget → recording state
  │    ├─ Start audio capture
  │    ├─ Detect active app
  │    └─ Buffer audio
  │
  ├─ Hotkey released:
  │    ├─ Widget → processing state
  │    ├─ Transcribe audio buffer
  │    ├─ Resolve profile (app mapping → default → none)
  │    ├─ If LLM enabled + profile found: refactor text
  │    ├─ Paste text into previously active app
  │    ├─ Widget → success state → idle
  │    └─ Save transcript
  │
  └─ Quit (from system tray):
       ├─ Unregister hotkey
       ├─ Unload model
       └─ Exit process
```

---

## 9. MVP Scope vs Future

### MVP (v1.0)
- Local Whisper STT only (no cloud STT).
- Single LLM provider at a time (local OR one remote).
- Profiles with app mappings.
- Floating widget with basic states (idle/recording/processing/success).
- Transcript history with search.
- Dashboard with basic stats.
- macOS + Windows.
- Light mode only.

### v1.1
- Audio-reactive FFT visualization in widget.
- Customizable widget position (drag & snap).
- Transcript export (JSON, CSV).
- Improved stats (charts, trends).

### v1.2
- Multiple LLM providers simultaneously (per-profile).
- Custom Whisper model import.
- Dark mode.
- Linux support.

### v2.0
- Streaming transcription (live preview while speaking).
- Multi-language auto-detection per utterance.
- Voice commands ("delete that", "new paragraph").
- Plugin system for custom post-processing.
- Team/cloud sync for profiles and settings.

---

## 10. Open Questions

1. **Expo feasibility:** Can Expo/React Native handle: global hotkeys, always-on-top floating windows, system tray, audio capture, and running native Whisper inference? This may require significant native modules.
2. **Widget rendering:** On macOS, an always-on-top window on all Spaces requires `NSWindow.collectionBehavior = .canJoinAllSpaces`. On Windows, `HWND_TOPMOST`. How does Expo handle this?
3. **Audio capture permissions:** macOS requires microphone entitlement. The app must handle the permission flow gracefully.
4. **Keychain storage:** API keys should be stored in the OS keychain, not in plain config files.
5. **Whisper inference runtime:** whisper.cpp (C++), whisper-rs (Rust bindings), or CoreML on Apple Silicon? Depends on chosen stack.
6. **Clipboard injection reliability:** Simulating Cmd+V has edge cases (apps that intercept paste differently, password fields, etc.).
