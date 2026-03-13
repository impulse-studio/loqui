import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import cn from "../../lib/utils/cn";
import useClickOutside from "../../lib/hooks/use-click-outside";
import Badge from "../badge";

export interface SearchableSelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  const closeDropdown = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, open, closeDropdown);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      scrollToHighlight(Math.min(highlightIndex + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      scrollToHighlight(Math.max(highlightIndex - 1, 0));
    }
    if (e.key === "Enter" && filtered[highlightIndex]) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex].value);
    }
  }

  function scrollToHighlight(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div
          className={cn(
            "flex items-center gap-2 border rounded-lg px-3 py-2 text-sm",
            "border-accent ring-2 ring-accent/20 bg-bg-primary",
          )}
        >
          <Search size={14} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search models..."
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
            "border-border bg-bg-primary text-text-primary hover:border-text-tertiary",
          )}
        >
          <span className="flex-1 text-left truncate">
            {selected?.label ?? placeholder}
          </span>
          {selected?.badge && (
            <Badge variant="accent">{selected.badge}</Badge>
          )}
          <ChevronDown size={14} className="text-text-tertiary shrink-0" />
        </button>
      )}

      {open && (
        <div
          ref={listRef}
          className={cn(
            "absolute left-0 right-0 top-full mt-1 z-50",
            "max-h-64 overflow-y-auto",
            "bg-bg-card rounded-lg border border-border",
            "shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-1",
          )}
        >
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-tertiary">
              No models found
            </p>
          )}
          {filtered.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                i === highlightIndex && "bg-bg-tertiary",
                opt.value === value
                  ? "text-accent"
                  : "text-text-primary",
              )}
            >
              <span className="flex-1 truncate">{opt.label}</span>
              {opt.badge && (
                <Badge variant="accent">{opt.badge}</Badge>
              )}
              {opt.value === value && (
                <Check size={14} className="shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
