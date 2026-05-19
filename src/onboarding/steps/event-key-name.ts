import keyEventToShortcut from "../../shared/lib/hotkey/key-event-to-shortcut";

// Use the same e.code-based mapping as the hotkey recorder so names match
// the stored hotkey format (e.g. "minus" not "-", "plus" not "=").
export default function eventKeyName(e: KeyboardEvent): string | null {
  return keyEventToShortcut(e.code);
}
