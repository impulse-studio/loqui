# Contributing to Loqui

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start the dev server: `npm run tauri dev`

## Project Structure

```
src-tauri/src/   — Rust backend (storage, audio, window modules)
src/             — React frontend (feature-based folders)
.doctor/         — Code quality verification scripts
```

## Code Conventions

### Frontend (TypeScript / React)

- **File naming:** kebab-case (`dashboard-page.tsx`, `use-invoke.ts`)
- **Components:** `export default function ComponentName`
- **One export per file** (except types, stores, API layers)
- **No inline sub-components** — extract to separate files
- **No inline constants** — extract to separate `.ts` files
- **Conditional classNames:** use `cn()` (clsx + tailwind-merge), never template literals
- **Imports:** max 2 `../` levels, no cross-feature imports (shared always allowed)
- **Max 500 lines per file** (warn at 350)

### Backend (Rust)

- Standard snake_case naming
- One command per file in `src/commands/`
- Proper error handling with the `AppError` type

### Verification

Run the doctor scripts before submitting:

```bash
bash .doctor/run.sh src
```

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes following the conventions above
3. Run `bash .doctor/run.sh src` and fix any warnings
4. Commit with a descriptive message (e.g. `feat: add dark mode toggle`)
5. Open a pull request against `main`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` code change that neither fixes a bug nor adds a feature
- `chore:` maintenance tasks

## Reporting Issues

Open an issue on GitHub with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- OS and version

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
