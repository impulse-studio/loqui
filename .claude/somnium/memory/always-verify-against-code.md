---
created_at: 2026-04-11T17:24:55.879411+00:00
updated_at: 2026-04-11T17:25:59.430775+00:00
category: project_memory
source: dream
tags: ["feedback", "codebase-search", "verification"]
---

# Always verify against code

Never report feature status, architecture details, or implementation state from documentation alone. Always read the actual source files — and read them comprehensively, not just one or two.

**Why:** This happened twice. First: assistant read `docs/IMPLEMENTATION.md` and reported system tray, app icon, and autostart as remaining — all three were already fully implemented. Second session: same mistake, same correction. The user explicitly stated: "when you are searching for something on a codebase you must always check the codebase instead of guessing or partially reading."

**How to apply:**
- When asked about what's done/missing/working, use Grep + Glob + Read on the actual source, not docs.
- Don't stop after reading one or two files. If a claim spans multiple features, check each relevant source file.
- Docs and implementation plans can be stale — the source is the source of truth.
- It's fine to use docs as a starting map, but cross-check every claim against real code before reporting.
- "Partially reading" is the same failure mode as not reading at all — be thorough.
