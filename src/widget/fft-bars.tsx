import barCount from "./constants/bar-count";

interface FftBarsProps {
  bars: number[];
}

export default function FftBars({ bars }: FftBarsProps) {
  return (
    <div className="flex items-center justify-center gap-[2px] h-full w-full px-2">
      {bars.slice(0, barCount).map((height, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/90"
          style={{
            height: "40%",
            transform: `scaleY(${Math.max(0.12, height)})`,
            transformOrigin: "center",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
