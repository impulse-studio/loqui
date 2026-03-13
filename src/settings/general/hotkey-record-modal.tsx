import { useEffect, useState } from "react";
import Modal from "../../shared/components/modal";
import Button from "../../shared/components/button";
import KeyCap from "../../shared/components/key-cap";
import { setHotkey } from "../../shared/lib/tauri-commands";
import parseShortcutDisplay from "../../shared/lib/hotkey/parse-shortcut-display";
import useHotkeyRecorder from "../../shared/lib/hotkey/use-hotkey-recorder";

interface HotkeyRecordModalProps {
  open: boolean;
  currentHotkey: string;
  onClose: () => void;
  onSaved: (hotkey: string) => void;
}

export default function HotkeyRecordModal({
  open,
  currentHotkey,
  onClose,
  onSaved,
}: HotkeyRecordModalProps) {
  const [recording, setRecording] = useState(false);
  const [combo, setCombo] = useState(currentHotkey);
  const [saving, setSaving] = useState(false);
  const { liveKeys, result, reset } = useHotkeyRecorder(recording);

  useEffect(() => {
    if (open) setCombo(currentHotkey);
  }, [open, currentHotkey]);

  useEffect(() => {
    if (result) {
      setCombo(result);
      setRecording(false);
    }
  }, [result]);

  async function handleSave() {
    setSaving(true);
    try {
      await setHotkey(combo);
      onSaved(combo);
    } catch (e) {
      console.error("Failed to set hotkey:", e);
    } finally {
      setSaving(false);
    }
  }

  const displayKeys =
    recording && liveKeys.length > 0
      ? parseShortcutDisplay(liveKeys.join("+"))
      : parseShortcutDisplay(combo);

  return (
    <Modal open={open} onClose={onClose} title="Change Hotkey">
      <div className="flex flex-col items-center gap-5 mb-6">
        {recording && liveKeys.length === 0 ? (
          <div className="flex items-center justify-center h-[100px] px-8 rounded-2xl border-2 border-accent border-dashed bg-accent/5">
            <span className="text-base text-accent animate-pulse">
              Press any key combination...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {displayKeys.map((k, i) => (
              <div key={k.label} className="flex items-center gap-3">
                {i > 0 && (
                  <span className="text-lg text-text-tertiary">+</span>
                )}
                <KeyCap label={k.label} symbol={k.symbol} size="lg" />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (recording) reset();
            setRecording(!recording);
          }}
          className="px-4 py-1.5 text-sm text-text-secondary border border-border rounded-lg hover:border-text-tertiary hover:text-text-primary transition-colors"
        >
          {recording ? "Cancel" : "Record new hotkey"}
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || recording || combo === currentHotkey}
        >
          {saving ? "Saving\u2026" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
