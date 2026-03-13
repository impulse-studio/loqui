#!/usr/bin/env bash
# Verify that #[tauri::command] handlers are NOT in lib.rs
# They should live in the commands/ module

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
ERRORS=0

# Check lib.rs for command handlers
lib_file="$SRC_DIR/lib.rs"
if [[ -f "$lib_file" ]]; then
  count=$(grep -c '#\[tauri::command\]' "$lib_file" 2>/dev/null || true)
  if [[ "$count" -gt 0 ]]; then
    echo "FAIL: $lib_file — has $count #[tauri::command] handler(s) (move to commands/ module)"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check main.rs for command handlers
main_file="$SRC_DIR/main.rs"
if [[ -f "$main_file" ]]; then
  count=$(grep -c '#\[tauri::command\]' "$main_file" 2>/dev/null || true)
  if [[ "$count" -gt 0 ]]; then
    echo "FAIL: $main_file — has $count #[tauri::command] handler(s) (move to commands/ module)"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Verify commands/ directory exists
if [[ ! -d "$SRC_DIR/commands" ]]; then
  echo "FAIL: $SRC_DIR/commands/ directory does not exist"
  ERRORS=$((ERRORS + 1))
fi

# Verify command handlers in commands/ are pub
while IFS= read -r file; do
  while IFS= read -r line_num; do
    [[ -z "$line_num" ]] && continue
    # Check the function line after #[tauri::command]
    next_line=$((line_num + 1))
    fn_line=$(sed -n "${next_line}p" "$file")
    if echo "$fn_line" | grep -q "^pub "; then
      : # good
    else
      echo "FAIL: $file:$next_line — command handler must be pub"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(grep -n '#\[tauri::command\]' "$file" 2>/dev/null | cut -d: -f1)
done < <(find "$SRC_DIR/commands" -type f -name "*.rs" 2>/dev/null | sort)

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: All commands are properly separated in commands/ module"
else
  echo ""
  echo "TOTAL: $ERRORS command separation violation(s)"
  exit 1
fi
