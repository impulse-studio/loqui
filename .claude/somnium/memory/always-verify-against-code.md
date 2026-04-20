---
created_at: 2026-04-11T17:24:55.879411+00:00
updated_at: 2026-04-20T17:32:32.985524+00:00
category: project_memory
source: dream
---

# Always verify against code

Never report feature status, file structure, or architecture from docs or memory alone — always read the current source files.

**Why:** Sub-agent incorrectly identified step-welcome.tsx as missing model UI; manual read confirmed the model step IS step-welcome.tsx (just misleadingly named). Docs and memory lag behind code.

**How to apply:** Before claiming a file exists, does X, or was changed — read it. Before claiming a feature is done — grep for the implementation.
