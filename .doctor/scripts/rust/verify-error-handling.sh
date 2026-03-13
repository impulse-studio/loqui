#!/usr/bin/env bash
# Verify no .map_err(|e| e.to_string()) antipattern in source files
# Commands should use AppError, not String errors

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
ERRORS=0

# Check for .to_string() error mapping
while IFS= read -r file; do
  count=$(grep -c 'map_err(|e| e\.to_string())' "$file" 2>/dev/null || true)
  if [[ "$count" -gt 0 ]]; then
    echo "FAIL: $file — has $count .map_err(|e| e.to_string()) (use AppError with #[from] instead)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type f -name "*.rs" | sort)

# Check for Result<T, String> in command signatures
while IFS= read -r file; do
  count=$(grep -c 'Result<.*,\s*String>' "$file" 2>/dev/null || true)
  if [[ "$count" -gt 0 ]]; then
    echo "FAIL: $file — has $count Result<T, String> return types (use Result<T, AppError> instead)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type f -name "*.rs" | sort)

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: No string-based error handling found"
else
  echo ""
  echo "TOTAL: $ERRORS error handling violation(s)"
  exit 1
fi
