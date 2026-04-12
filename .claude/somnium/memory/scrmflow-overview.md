---
created_at: 2026-04-11T16:58:36.389157+00:00
updated_at: 2026-04-11T17:26:00.157069+00:00
category: project_memory
source: dream
tags: ["project", "status", "phases"]
---

# ScrmFlow overview

ScrmFlow is a local-first, privacy-focused speech-to-text desktop companion.

**What it does:** Captures microphone audio and transcribes speech entirely on-device (no cloud APIs). Provides a floating overlay widget for real-time transcription and a full dashboard for managing transcripts and profiles.

**Stack:** Tauri 2 (Rust backend) + React 19 + TypeScript + Tailwind v4 + Zustand + React Router v7. SQLite for local storage.

**Two-window architecture:**
- `index.html` → main dashboard (settings, transcripts, profiles)
- `widget.html` → floating NSPanel overlay that works over fullscreen apps on macOS

**Why:** Local-first means audio never leaves the machine — privacy by design.

**Phase status (as of 2026-04-11, verified against source):**
- Phase 1 DONE: Scaffolding, SQLite, 11 commands, 13+ shared components, layout, routing
- Phase 2 DONE: Whisper model manager, audio capture (cpal), hotkey handler, onboarding step flow
- Phase 3 IN PROGRESS: Agent pipeline (state machine, app detection, clipboard paste, LLM step)
- Phase 4 DONE: Widget (state rendering, FFT bars, animations)
- Phase 5 DONE: Dashboard, stats, activity chart, transcripts page
- Phase 6 DONE: Profiles page, system prompt presets, app mapping, LLM providers
- Phase 7 DONE: Settings pages (general, speech, LLM, widget, data, about)
- Phase 8 ~85% DONE:
  - DONE: System tray icon + menu (`window/tray.rs`), launch at startup (tauri-plugin-autostart), real app icon (.icns/.ico/all sizes), NSPanel widget overlay
  - REMAINING: Notification sounds on transcription complete, microphone permission denial UI/flow
