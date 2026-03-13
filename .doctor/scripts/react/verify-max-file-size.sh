#!/usr/bin/env bash
# Verify no .ts/.tsx file exceeds the maximum line count
# Env vars: MAX_FILE_LINES (default 500), WARN_FILE_LINES (default 350)

set -euo pipefail

SRC_DIR="${1:-src}"
ERRORS=0
WARNINGS=0
MAX_LINES="${MAX_FILE_LINES:-500}"
WARN_LINES="${WARN_FILE_LINES:-350}"

while IFS= read -r file; do
  lines=$(wc -l < "$file" | tr -d ' ')

  if [[ "$lines" -gt "$MAX_LINES" ]]; then
    echo "FAIL: $file — $lines lines (max $MAX_LINES)"
    ERRORS=$((ERRORS + 1))
  elif [[ "$lines" -gt "$WARN_LINES" ]]; then
    echo "WARN: $file — $lines lines (approaching $MAX_LINES limit)"
    WARNINGS=$((WARNINGS + 1))
  fi
done < <(find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.d.ts" | sort)

if [[ $ERRORS -eq 0 ]]; then
  if [[ $WARNINGS -gt 0 ]]; then
    echo "OK: No files exceed $MAX_LINES lines ($WARNINGS warning(s) at $WARN_LINES+ lines)"
  else
    echo "OK: All files are under $MAX_LINES lines"
  fi
else
  echo ""
  echo "TOTAL: $ERRORS file(s) exceed $MAX_LINES lines"
  exit 1
fi
