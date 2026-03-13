#!/usr/bin/env bash
# .doctor — Project-wide verification runner
# Runs all checks and reports per-check pass/fail.
#
# Usage: bash .doctor/run.sh [src-dir]
# Exit:  0 if all checks pass, 1 if any check fails

set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-src}"
RUST_SRC="src-tauri/src"
FAIL=0
RESULTS=()

# React checks
REACT_CHECKS=("file-naming" "component-format" "name-match" "unused-files" "duplicates" "max-file-size" "import-depth" "tailwind-consistency" "index-reexports")

for check in "${REACT_CHECKS[@]}"; do
  echo ""
  echo "── react/${check} ─────────────────────────────────────────"
  if bash "$DIR/scripts/react/verify-${check}.sh" "$SRC"; then
    RESULTS+=("  ✓ react/${check}")
  else
    RESULTS+=("  ✗ react/${check}")
    FAIL=1
  fi
done

# Rust checks
RUST_CHECKS=("module-style" "naming" "error-handling" "commands" "function-count" "max-file-size" "duplicates")

for check in "${RUST_CHECKS[@]}"; do
  echo ""
  echo "── rust/${check} ──────────────────────────────────────────"
  if bash "$DIR/scripts/rust/verify-${check}.sh" "$RUST_SRC"; then
    RESULTS+=("  ✓ rust/${check}")
  else
    RESULTS+=("  ✗ rust/${check}")
    FAIL=1
  fi
done

echo ""
echo "── Summary ─────────────────────────────────────────"
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "All checks passed."
else
  echo "Some checks failed."
fi

exit $FAIL
