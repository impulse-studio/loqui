import contextSizeConstants from "./context-size-constants";

interface ContextSizeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function ContextSizeSlider({
  value,
  onChange,
}: ContextSizeSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          Context Size
        </label>
        <span className="text-sm text-text-secondary tabular-nums">
          {value.toLocaleString()} tokens
        </span>
      </div>
      <input
        type="range"
        min={contextSizeConstants.min}
        max={contextSizeConstants.max}
        step={contextSizeConstants.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-xs text-text-tertiary">
        <span>{contextSizeConstants.min.toLocaleString()}</span>
        <span>{contextSizeConstants.max.toLocaleString()}</span>
      </div>
    </div>
  );
}
