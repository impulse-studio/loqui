#!/usr/bin/env bash
# Verify no .rs file has too many public functions
# WARN at 5+ pub fn, FAIL at 8+ pub fn
# Excludes commands/ (thin wrappers grouped by domain)

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
WARN_THRESHOLD=5
FAIL_THRESHOLD=8
ERRORS=0
WARNINGS=0

while IFS= read -r file; do
  # Skip commands/ directory — command handlers are thin wrappers grouped by domain
  if echo "$file" | grep -q "/commands/"; then
    continue
  fi

  count=$(grep -cE '^\s*pub (async )?fn ' "$file" 2>/dev/null || true)

  if [[ "$count" -ge "$FAIL_THRESHOLD" ]]; then
    echo "FAIL: $file — $count pub fn (max $FAIL_THRESHOLD). Split into smaller modules."
    ERRORS=$((ERRORS + 1))
  elif [[ "$count" -ge "$WARN_THRESHOLD" ]]; then
    echo "WARN: $file — $count pub fn (consider splitting at $WARN_THRESHOLD+)"
    WARNINGS=$((WARNINGS + 1))
  fi
done < <(find "$SRC_DIR" -type f -name "*.rs" | sort)

if [[ $ERRORS -eq 0 ]]; then
  if [[ $WARNINGS -gt 0 ]]; then
    echo ""
    echo "OK (with $WARNINGS warning(s)): No file exceeds $FAIL_THRESHOLD pub fn"
  else
    echo "OK: All files have reasonable function counts"
  fi
else
  echo ""
  echo "TOTAL: $ERRORS file(s) exceed $FAIL_THRESHOLD pub fn"
  exit 1
fi
