import { AlertTriangle, ExternalLink } from "lucide-react";
import cn from "../../shared/lib/utils/cn";

interface LlmModelOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  downloaded?: boolean;
  onSelect: () => void;
  onGoToSettings?: () => void;
}

export default function LlmModelOption({
  label,
  description,
  selected,
  downloaded = true,
  onSelect,
  onGoToSettings,
}: LlmModelOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
        selected
          ? "border-accent bg-accent/5"
          : "border-border hover:bg-bg-secondary",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
            selected ? "border-accent" : "border-text-tertiary",
          )}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </div>
        <span
          className={cn(
            "text-sm",
            downloaded ? "text-text-primary" : "text-text-tertiary",
          )}
        >
          {label}
        </span>
      </div>
      {description && (
        <p className="text-xs text-text-secondary mt-0.5 ml-5.5">
          {description}
        </p>
      )}
      {!downloaded && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-5.5">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-xs text-warning">Not downloaded</span>
          {onGoToSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGoToSettings();
              }}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer"
            >
              Go to Settings
              <ExternalLink size={10} />
            </button>
          )}
        </div>
      )}
    </button>
  );
}
