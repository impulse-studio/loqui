import { useState } from "react";
import { Check } from "lucide-react";
import Button from "../../shared/components/button";
import promptTemplates from "./prompt-templates";
import cn from "../../shared/lib/utils/cn";

interface TemplatePickerProps {
  onApply: (prompt: string) => void;
}

export default function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = promptTemplates.find((t) => t.id === selectedId);

  function handleChipClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleApply() {
    if (selected) {
      onApply(selected.prompt);
      setSelectedId(null);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">
        Templates
      </label>
      <div className="flex flex-wrap gap-2">
        {promptTemplates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleChipClick(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              selectedId === t.id
                ? "bg-accent text-white"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-2 space-y-2">
          <div className="p-3 rounded-lg bg-bg-secondary text-sm text-text-secondary border border-border">
            {selected.prompt}
          </div>
          <Button size="sm" onClick={handleApply}>
            <Check size={14} />
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
