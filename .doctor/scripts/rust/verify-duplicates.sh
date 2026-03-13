#!/usr/bin/env bash
# Verify no same-named .rs files across different directories have >85% similar content
# Catches copy-paste duplication between modules (e.g. stt/model_manager.rs vs llm/model_manager.rs)
# Compatible with bash 3.x (macOS default)

set -euo pipefail

SRC_DIR="${1:-src-tauri/src}"
SIMILARITY_THRESHOLD=85
ERRORS=0

# Collect all basenames that appear more than once
dupes=$(find "$SRC_DIR" -type f -name "*.rs" -exec basename {} \; | sort | uniq -d)

for basename_f in $dupes; do
  # Get all files with this basename
  files=()
  while IFS= read -r f; do
    files+=("$f")
  done < <(find "$SRC_DIR" -type f -name "$basename_f" | sort)

  # Compare each pair
  for ((i=0; i<${#files[@]}; i++)); do
    for ((j=i+1; j<${#files[@]}; j++)); do
      file_a="${files[$i]}"
      file_b="${files[$j]}"

      # Skip if either file is very small (< 10 lines)
      lines_a=$(wc -l < "$file_a" | tr -d ' ')
      lines_b=$(wc -l < "$file_b" | tr -d ' ')
      if [[ "$lines_a" -lt 10 ]] || [[ "$lines_b" -lt 10 ]]; then
        continue
      fi

      # Calculate similarity using diff
      total_lines=$(( lines_a + lines_b ))
      diff_lines=$(diff "$file_a" "$file_b" | grep -cE '^[<>]' || true)
      if [[ "$total_lines" -eq 0 ]]; then
        continue
      fi
      similarity=$(( (total_lines - diff_lines) * 100 / total_lines ))

      if [[ "$similarity" -ge "$SIMILARITY_THRESHOLD" ]]; then
        echo "FAIL: $file_a ↔ $file_b — ${similarity}% similar (threshold: ${SIMILARITY_THRESHOLD}%). Extract shared logic."
        ERRORS=$((ERRORS + 1))
      fi
    done
  done
done

if [[ $ERRORS -eq 0 ]]; then
  echo "OK: No duplicate Rust files detected"
else
  echo ""
  echo "TOTAL: $ERRORS duplicate pair(s) found"
  exit 1
fi
