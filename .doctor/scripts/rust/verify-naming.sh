#!/usr/bin/env bash
# Verify all .rs files and directories under src/ use snake_case naming
# snake_case: lowercase letters, digits, underscores only

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
ERRORS=0

# Check file names
while IFS= read -r file; do
  basename_f=$(basename "$file")
  # Must be snake_case: only lowercase, digits, underscores, dots (for extension)
  if echo "$basename_f" | grep -qE '[A-Z]|[- ]'; then
    echo "FAIL: $file — file name must be snake_case"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type f -name "*.rs" | sort)

# Check directory names
while IFS= read -r dir; do
  dirname_f=$(basename "$dir")
  [[ "$dirname_f" == "src" ]] && continue
  if echo "$dirname_f" | grep -qE '[A-Z]|[- ]'; then
    echo "FAIL: $dir — directory name must be snake_case"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type d | sort)

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: All file and directory names are snake_case"
else
  echo ""
  echo "TOTAL: $ERRORS naming violation(s)"
  exit 1
fi
