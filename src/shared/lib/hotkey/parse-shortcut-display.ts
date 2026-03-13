export interface KeyDisplay {
  label: string;
  symbol: string;
}

const MODIFIER_DISPLAY: Record<string, KeyDisplay> = {
  ctrl: { label: "Ctrl", symbol: "\u2303" },
  alt: { label: "Option", symbol: "\u2325" },
  shift: { label: "Shift", symbol: "\u21E7" },
  super: { label: "Cmd", symbol: "\u2318" },
};

const KEY_DISPLAY: Record<string, KeyDisplay> = {
  space: { label: "Space", symbol: "\u2423" },
  enter: { label: "Enter", symbol: "\u21B5" },
  tab: { label: "Tab", symbol: "\u21E5" },
  backspace: { label: "Delete", symbol: "\u232B" },
  delete: { label: "Fwd Del", symbol: "\u2326" },
  escape: { label: "Esc", symbol: "\u238B" },
  up: { label: "Up", symbol: "\u2191" },
  down: { label: "Down", symbol: "\u2193" },
  left: { label: "Left", symbol: "\u2190" },
  right: { label: "Right", symbol: "\u2192" },
};

/**
 * Parse a shortcut string like "alt+space" into displayable key parts.
 */
export default function parseShortcutDisplay(shortcut: string): KeyDisplay[] {
  const parts = shortcut.toLowerCase().split("+");
  return parts.map((part) => {
    if (MODIFIER_DISPLAY[part]) return MODIFIER_DISPLAY[part];
    if (KEY_DISPLAY[part]) return KEY_DISPLAY[part];
    if (part.length === 1) return { label: part.toUpperCase(), symbol: "" };
    if (/^f\d+$/.test(part)) return { label: part.toUpperCase(), symbol: "" };
    return { label: part.charAt(0).toUpperCase() + part.slice(1), symbol: "" };
  });
}
