import type { ReactNode } from "react";

interface GlowPillProps {
  children: ReactNode;
  color: "recording" | "processing" | "success" | "error";
}

export default function GlowPill({
  children,
  color,
}: GlowPillProps) {
  const colorValues: Record<string, string> = {
    recording: "var(--color-recording)",
    processing: "var(--color-accent)",
    success: "var(--color-success)",
    error: "var(--color-error)",
  };

  const glowColor = colorValues[color] ?? colorValues.recording;
  const isFlash = color === "success" || color === "error";
  const speed = color === "recording" ? "2s" : "4s";

  return (
    <div
      className="relative w-[64px] h-[26px] rounded-xl select-none"
      style={
        isFlash
          ? { animation: `flash-${color} 0.8s ease-out` }
          : {
              background: `conic-gradient(from var(--glow-angle), transparent 30%, ${glowColor} 50%, transparent 70%)`,
              animation: `glow-rotate ${speed} linear infinite`,
            }
      }
    >
      <div
        className="
          absolute inset-[1.5px]
          flex items-center justify-center
          rounded-[10px]
          bg-text-primary/85
          backdrop-blur-sm
        "
      >
        {children}
      </div>
    </div>
  );
}
