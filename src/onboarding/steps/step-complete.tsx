import { useEffect, useState } from "react";
import { getModels, type ModelStatus } from "../../shared/lib/tauri-commands";
import { useAgentStore } from "../../shared/stores/agent-store";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import KeyCap from "../../shared/components/key-cap";
import parseShortcutDisplay from "../../shared/lib/hotkey/parse-shortcut-display";
import tierLabels from "../../shared/components/model-card/tier-labels";
import type { StepComponentProps } from "../step-registry";

export default function StepComplete({ onComplete, setFooter }: StepComponentProps) {
  const config = useAgentStore((s) => s.config);
  const hotkey = config.hotkey || DEFAULT_CONFIG.hotkey!;
  const modelId = config.sttModel || DEFAULT_CONFIG.sttModel!;
  const hotkeyKeys = parseShortcutDisplay(hotkey);

  const [models, setModels] = useState<ModelStatus[]>([]);
  useEffect(() => { getModels().then(setModels).catch(console.error); }, []);

  const selectedModel = models.find((m) => m.id === modelId);
  const modelLabel = selectedModel
    ? (tierLabels[selectedModel.accuracyTier] ?? selectedModel.name)
    : modelId;

  // No footer — this step has its own CTA
  useEffect(() => {
    setFooter(null);
  }, [setFooter]);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mb-2">
        You're All Set!
      </h2>
      <p className="text-sm text-text-secondary mb-8 text-center">
        Loqui is ready to use. Hold your hotkey, speak, and the transcribed
        text will be pasted into your active app.
      </p>

      <div className="w-full max-w-sm space-y-3 mb-8">
        <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-border">
          <span className="text-sm text-text-secondary">Hotkey</span>
          <div className="flex items-center gap-1">
            {hotkeyKeys.map((k) => (
              <KeyCap key={k.label} label={k.label} symbol={k.symbol} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-border">
          <span className="text-sm text-text-secondary">Model</span>
          <span className="text-sm text-text-primary font-medium">
            {modelLabel}
          </span>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-sm py-3 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}
