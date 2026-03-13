#!/usr/bin/env bash
# Verify all .ts/.tsx/.css files under src/ use kebab-case naming
# Folders must also be kebab-case
# Exceptions: vite-env.d.ts (Vite convention)

set -euo pipefail

SRC_DIR="${1:-src}"
ERRORS=0

# Check file names
while IFS= read -r file; do
  basename=$(basename "$file")

  # Skip vite-env.d.ts (Vite convention)
  [[ "$basename" == "vite-env.d.ts" ]] && continue

  # Remove extension for checking
  name="${basename%%.*}"

  # Check: must be lowercase, only a-z, 0-9, hyphens
  if [[ ! "$name" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    echo "FAIL: $file — filename '$basename' is not kebab-case"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | sort)

# Check folder names (only src/ subdirectories)
while IFS= read -r dir; do
  dirname=$(basename "$dir")

  # Skip root src/ and node_modules
  [[ "$dirname" == "src" ]] && continue
  [[ "$dirname" == "node_modules" ]] && continue

  if [[ ! "$dirname" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    echo "FAIL: $dir/ — folder name '$dirname' is not kebab-case"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$SRC_DIR" -type d | sort)

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: All file and folder names are kebab-case"
else
  echo ""
  echo "TOTAL: $ERRORS naming violation(s)"
  exit 1
fi
