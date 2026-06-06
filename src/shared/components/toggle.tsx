import cn from "../lib/utils/cn";

// Every switch must have an accessible name: either a visible `label` or an
// `ariaLabel` (for switches whose text label lives elsewhere in the row).
// The union makes an unnamed `<Toggle>` a compile-time error.
type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
} & (
  | { label: string; ariaLabel?: string }
  | { ariaLabel: string; label?: string }
);

export default function Toggle({ checked, onChange, label, ariaLabel, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 select-none",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          // The track. `items-center` + symmetric padding keeps the knob
          // perfectly centered at any size — no magic margins to drift.
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5",
          "transition-colors duration-200 ease-out motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? "bg-accent" : "bg-bg-tertiary",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white",
            "shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.04)]",
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  );
}
