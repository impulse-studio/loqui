import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Card from "../../shared/components/card";
import cn from "../../shared/lib/utils/cn";

interface LlmRemoteSettingsProps {
  name: string;
  placeholder: string;
  isSet: boolean;
  onSave: (key: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

export default function LlmRemoteSettings({
  name,
  placeholder,
  isSet,
  onSave,
  onRemove,
}: LlmRemoteSettingsProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSave(trimmed);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">{name}</h3>
        <span
          className={cn(
            "text-xs",
            isSet ? "text-success" : "text-text-tertiary",
          )}
        >
          {isSet ? "Connected" : "Not configured"}
        </span>
      </div>
      <Card className="px-5 py-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">
            API Key
          </label>
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={isSet ? "Enter new key to replace" : placeholder}
              disabled={busy}
              className="w-full h-9 px-3 pr-9 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !draft.trim()}
              className="px-3 h-8 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSet ? "Replace" : "Save"}
            </button>
            {isSet && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="px-3 h-8 rounded-md border border-border text-xs font-medium text-text-secondary hover:bg-bg-secondary disabled:opacity-40 cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
