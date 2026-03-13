import barCount from "./constants/bar-count";

export default function WaveBars() {
  return (
    <div className="flex items-center justify-center gap-[2px] h-full w-full px-2">
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/80"
          style={{
            height: "40%",
            transform: "scaleY(0.15)",
            transformOrigin: "center",
            animation: "wave-bar 1.2s ease-in-out infinite",
            animationDelay: `${i * 100}ms`,
            animationFillMode: "backwards",
          }}
        />
      ))}
    </div>
  );
}
