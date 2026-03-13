# Loqui - Descriptions

Ready-to-copy descriptions for various platforms and contexts. All lengths available.

---

## One-Liner (< 10 words)

> Speak anywhere. Text everywhere.

---

## Micro (< 20 words)

> Loqui is a local-first voice-to-text desktop companion. Hold a key, speak, release - polished text appears where your cursor is.

---

## Short (1-2 sentences / ~40 words)

> Loqui turns your voice into clean, ready-to-use text in any app. Hold a hotkey, speak naturally, and AI-polished text appears wherever your cursor is — all processed locally on your machine. No cloud. No account. No friction.

---

## Medium (~100 words)

> Loqui is a desktop voice-to-text companion that runs entirely on your machine. Hold a global hotkey from any app - Slack, VS Code, your browser, anywhere - speak naturally, and release. Your words are transcribed locally using Whisper, optionally refined by an LLM (local or your own API key), and pasted directly where your cursor is.
>
> What makes Loqui different: it detects which app you're in and automatically adapts the writing style. Casual in Slack, technical in your IDE, formal in email - without you changing a thing.
>
> No audio leaves your device. No account required. No subscription.

---

## Long (~200 words)

> Loqui is a local-first, always-on speech-to-text desktop companion for macOS. It lives as a tiny floating widget on your screen - invisible until you need it.
>
> The workflow is simple: hold a system-wide hotkey, speak naturally, release. Loqui transcribes your speech on-device using Whisper (OpenAI's speech recognition engine running locally via whisper.cpp with Metal GPU acceleration), optionally cleans it up with an LLM, and pastes the polished text directly into whatever app you were using.
>
> The magic is in context-awareness. Loqui detects the active application and automatically applies the right writing profile - casual tone for Slack, technical precision for your IDE, formal structure for email. Each profile can use a different LLM (local Qwen3 models or remote APIs like GPT-4o, Claude, or Gemini - bring your own key).
>
> Every dictation is saved with full metadata: raw vs. refined text, app context, word count, duration, and LLM cost tracking. A dashboard shows your stats and activity over time.
>
> Your audio never leaves your device. Your text is processed locally. No cloud, no account, no subscription - just you, speaking.

---

## App Store / Product Hunt (~150 words)

> **Loqui - Your voice, everywhere you type.**
>
> Hold a hotkey. Speak. Release. Clean text appears right where your cursor is - in any app, on any desktop.
>
> Powered by Whisper running locally on your Mac, Loqui transcribes your voice without sending a single byte to the cloud. An optional AI step (local or bring-your-own-key) refines your words to match the context: casual in Slack, technical in your IDE, formal in email.
>
> **Key features:**
> - System-wide hotkey - works in any app, even fullscreen
> - 100% local speech recognition (Whisper + Metal GPU)
> - Context-aware profiles that adapt to each app automatically
> - Always-on floating widget with audio-reactive visualization
> - Full transcript history with search, stats, and export
> - Optional LLM cleanup: local (Qwen3) or remote (GPT-4o, Claude, Gemini)
>
> No account. No subscription. No data leaves your machine.

---

## GitHub README (~120 words)

> **Loqui** - Local-first voice-to-text desktop companion.
>
> Hold a hotkey, speak, release. Polished text appears wherever your cursor is.
>
> - **Local STT** - Whisper.cpp with Metal acceleration. No audio leaves your device.
> - **Smart cleanup** - Optional LLM refactoring (local Qwen3 or BYOK: OpenAI, Anthropic, Google).
> - **Context-aware** - Profiles auto-detect your active app and adapt the writing style.
> - **Always-on widget** - Tiny floating indicator on all desktops, even fullscreen.
> - **Full history** - Searchable transcripts with stats, cost tracking, and export.
>
> Built with Tauri 2 (Rust) + React 19 + TypeScript.
>
> **Privacy:** Zero cloud dependency. Zero telemetry. Zero account required.

---

## Social Media / Twitter (~250 characters)

> Loqui - hold a key, speak, release. Clean text appears where your cursor is. 100% local speech recognition, AI-powered text cleanup, auto-adapts to each app. No cloud. No account. Your voice stays on your machine.

---

## Elevator Pitch (spoken, ~30 seconds)

> "Loqui is like having a personal stenographer built into your Mac. You hold a hotkey, speak naturally, and polished text appears wherever your cursor is - Slack, VS Code, email, anywhere. It runs Whisper locally so your audio never leaves your machine, and it's smart enough to know that when you're in Slack you want casual, and when you're in your IDE you want technical. Zero cloud, zero subscription - it just works."

---

## Technical / Developer Audience (~80 words)

> Loqui is a Tauri 2 desktop app (Rust + React) that provides system-wide voice-to-text with local inference. STT runs via whisper-rs (whisper.cpp bindings) with Metal acceleration. Optional LLM post-processing uses llama-cpp-2 locally or OpenAI/Anthropic/Google APIs remotely. Global hotkey capture uses CGEventTap, text injection uses CGEventPost for simulated Cmd+V. App detection via NSWorkspace. Profile system allows per-app LLM configuration with automatic resolution. SQLite for persistence. No network required for core functionality.
