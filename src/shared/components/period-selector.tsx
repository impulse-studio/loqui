import cn from "../lib/utils/cn";

interface PeriodSelectorProps {
  periods: string[];
  active: string;
  onChange: (period: string) => void;
}

export default function PeriodSelector({ periods, active, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
            period === active
              ? "bg-accent text-white"
              : "text-text-secondary hover:bg-bg-tertiary"
          )}
        >
          {period}
        </button>
      ))}
    </div>
  );
}
