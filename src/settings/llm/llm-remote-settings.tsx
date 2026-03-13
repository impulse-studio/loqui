import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Card from "../../shared/components/card";

interface LlmRemoteSettingsProps {
  name: string;
  apiKey: string;
  placeholder: string;
  onApiKeyChange: (value: string) => void;
}

export default function LlmRemoteSettings({
  name,
  apiKey,
  placeholder,
  onApiKeyChange,
}: LlmRemoteSettingsProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">{name}</h3>
        <span className="text-xs text-text-tertiary">
          {apiKey ? "Connected" : "Not configured"}
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
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-9 px-3 pr-9 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
