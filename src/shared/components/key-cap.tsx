import cn from "../lib/utils/cn";

interface KeyCapProps {
  label: string;
  symbol?: string;
  size?: "sm" | "lg";
}

export default function KeyCap({ label, symbol, size = "sm" }: KeyCapProps) {
  const isLarge = size === "lg";

  return (
    <span
      className={cn(
        "inline-flex flex-col items-center justify-center border border-border/60 font-medium text-text-primary select-none",
        isLarge
          ? "min-w-[100px] h-[100px] px-5 gap-1.5 rounded-2xl"
          : "min-w-[40px] h-[40px] px-3 rounded-lg"
      )}
      style={{
        background: "linear-gradient(to bottom, var(--color-bg-card), var(--color-bg-tertiary))",
        boxShadow: isLarge
          ? "0 2px 0 0 var(--color-border), 0 4px 12px rgba(0,0,0,0.08)"
          : "0 2px 0 0 var(--color-border), 0 2px 6px rgba(0,0,0,0.06)",
      }}
    >
      {symbol && (
        <span className={cn(isLarge ? "text-2xl" : "text-sm")}>
          {symbol}
        </span>
      )}
      <span className={cn(isLarge ? "text-sm text-text-secondary" : "text-xs")}>
        {label}
      </span>
    </span>
  );
}
