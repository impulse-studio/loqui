#!/usr/bin/env bash
# Verify no mod.rs files exist (modern file-per-module style)
# Exceptions: none — all modules should use sibling .rs files

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
ERRORS=0

while IFS= read -r file; do
  echo "FAIL: $file — use modern style (rename to sibling .rs file)"
  ERRORS=$((ERRORS + 1))
done < <(find "$SRC_DIR" -name "mod.rs" -type f 2>/dev/null | sort)

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: All modules use modern file-per-module style"
else
  echo ""
  echo "TOTAL: $ERRORS mod.rs file(s) found"
  exit 1
fi
