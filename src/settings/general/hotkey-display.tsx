import KeyCap from "../../shared/components/key-cap";
import parseShortcutDisplay from "../../shared/lib/hotkey/parse-shortcut-display";

interface HotkeyDisplayProps {
  hotkey: string;
}

export default function HotkeyDisplay({ hotkey }: HotkeyDisplayProps) {
  const keys = parseShortcutDisplay(hotkey);

  return (
    <div className="flex items-center gap-2">
      {keys.map((k, i) => (
        <div key={k.label} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-text-tertiary text-xs">+</span>
          )}
          <KeyCap label={k.label} symbol={k.symbol} />
        </div>
      ))}
    </div>
  );
}
