# Loqui

**Local-first voice-to-text desktop companion.**

Hold a hotkey, speak, release. Polished text appears wherever your cursor is.

- **Local STT** — Whisper.cpp with Metal acceleration. No audio leaves your device.
- **Smart cleanup** — Optional LLM refactoring (local Qwen3 or BYOK: OpenAI, Anthropic, Google).
- **Context-aware** — Profiles auto-detect your active app and adapt the writing style.
- **Always-on widget** — Tiny floating indicator on all desktops, even fullscreen.
- **Full history** — Searchable transcripts with stats, cost tracking, and export.

**Privacy:** Zero cloud dependency. Zero telemetry. Zero account required.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Backend  | Tauri 2 (Rust)                          |
| Frontend | React 19, TypeScript, Tailwind CSS v4   |
| State    | Zustand                                 |
| Routing  | React Router v7                         |
| STT      | whisper.cpp (via whisper-rs)             |
| LLM      | llama.cpp (local) / OpenAI, Anthropic, Google (remote) |
| Database | SQLite                                  |

## Platform Support

| Platform              | Status          |
| --------------------- | --------------- |
| macOS (Apple Silicon)  | Fully supported |
| macOS (Intel)          | Fully supported |
| Windows                | Fully supported |
| Linux (X11)            | Fully supported |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the Apache License 2.0 — see [LICENSE](LICENSE) for details.
