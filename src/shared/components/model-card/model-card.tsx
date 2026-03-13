import type { ModelStatus } from "../../lib/tauri-commands";
import cn from "../../lib/utils/cn";
import formatFileSize from "../../lib/utils/format-file-size";
import tierLabels from "./tier-labels";
import tierToStrength from "./tier-to-strength";

interface ModelCardProps {
  model: ModelStatus;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export default function ModelCard({ model, selected, disabled, onSelect }: ModelCardProps) {
  const tierName = tierLabels[model.accuracyTier] ?? model.accuracyTier;
  const strength = tierToStrength(model.accuracyTier);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        selected
          ? "border-accent bg-accent/5"
          : "border-border bg-bg-card hover:border-text-tertiary"
      )}
    >
      {/* Signal bars icon */}
      <svg viewBox="0 0 24 24" className={cn("w-8 h-8", selected ? "text-accent" : "text-text-tertiary")}>
        <rect x={1} y={18} width={4} height={6} rx={1} fill="currentColor" opacity={strength >= 1 ? 1 : 0.2} />
        <rect x={7} y={13} width={4} height={11} rx={1} fill="currentColor" opacity={strength >= 2 ? 1 : 0.2} />
        <rect x={13} y={8} width={4} height={16} rx={1} fill="currentColor" opacity={strength >= 3 ? 1 : 0.2} />
        <rect x={19} y={3} width={4} height={21} rx={1} fill="currentColor" opacity={strength >= 4 ? 1 : 0.2} />
      </svg>

      {/* Tier name */}
      <span className="text-sm font-medium text-text-primary">{tierName}</span>

      {/* Size or downloaded indicator */}
      {model.downloaded ? (
        <div className="flex items-center gap-1 text-success">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs">Ready</span>
        </div>
      ) : (
        <span className="text-xs text-text-tertiary">{formatFileSize(model.size)}</span>
      )}
    </button>
  );
}
