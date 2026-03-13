const CODE_TO_KEY: Record<string, string> = {
  Space: "space",
  Enter: "enter",
  Tab: "tab",
  Backspace: "backspace",
  Delete: "delete",
  Escape: "escape",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Minus: "minus",
  Equal: "plus",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  ShiftLeft: "shift",
  ShiftRight: "shift",
  ControlLeft: "ctrl",
  ControlRight: "ctrl",
  AltLeft: "alt",
  AltRight: "alt",
  MetaLeft: "super",
  MetaRight: "super",
  CapsLock: "capslock",
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(65 + i);
      return [`Key${letter}`, letter.toLowerCase()];
    }),
  ),
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`Digit${i}`, String(i)]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => [`F${i + 1}`, `f${i + 1}`]),
  ),
};

/**
 * Convert a DOM keyboard event code into the tauri key name.
 * Returns null for unknown codes.
 */
export default function keyEventToShortcut(code: string): string | null {
  return CODE_TO_KEY[code] ?? null;
}
