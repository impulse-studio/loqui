import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import cn from "../../lib/utils/cn";
import useClickOutside from "../../lib/hooks/use-click-outside";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  fullWidth = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-text-tertiary",
          fullWidth && "w-full justify-between h-9",
          open && "border-accent ring-2 ring-accent/20",
        )}
      >
        <span className={cn(fullWidth && "truncate")}>
          {selected?.label ?? placeholder ?? "Select..."}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-text-tertiary transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-1 z-50 bg-bg-card rounded-lg border border-border shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-1",
            fullWidth ? "left-0 right-0" : "right-0 min-w-[180px]",
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-start gap-2",
                opt.value === value
                  ? "bg-accent-subtle text-accent"
                  : "text-text-primary hover:bg-bg-tertiary",
              )}
            >
              <div className="flex-1">
                <div>{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {opt.description}
                  </div>
                )}
              </div>
              {opt.value === value && (
                <Check size={14} className="shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
