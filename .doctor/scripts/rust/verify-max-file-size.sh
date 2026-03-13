#!/usr/bin/env bash
# Verify no .rs file exceeds max line count
# WARN at 350+ lines, FAIL at 500+ lines

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
WARN_THRESHOLD=350
FAIL_THRESHOLD=500
ERRORS=0
WARNINGS=0

while IFS= read -r file; do
  lines=$(wc -l < "$file" | tr -d ' ')

  if [[ "$lines" -ge "$FAIL_THRESHOLD" ]]; then
    echo "FAIL: $file — $lines lines (max $FAIL_THRESHOLD). Split into smaller modules."
    ERRORS=$((ERRORS + 1))
  elif [[ "$lines" -ge "$WARN_THRESHOLD" ]]; then
    echo "WARN: $file — $lines lines (consider splitting at $WARN_THRESHOLD+)"
    WARNINGS=$((WARNINGS + 1))
  fi
done < <(find "$SRC_DIR" -type f -name "*.rs" | sort)

if [[ $ERRORS -eq 0 ]]; then
  if [[ $WARNINGS -gt 0 ]]; then
    echo ""
    echo "OK (with $WARNINGS warning(s)): No file exceeds $FAIL_THRESHOLD lines"
  else
    echo "OK: All files are within size limits"
  fi
else
  echo ""
  echo "TOTAL: $ERRORS file(s) exceed $FAIL_THRESHOLD lines"
  exit 1
fi
