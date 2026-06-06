import { useEffect, useState } from "react";
import Card from "../../shared/components/card";
import { getTranscriptStats } from "../../shared/lib/tauri-commands";
import type { TranscriptStats } from "../../shared/types/transcript";
import statCards from "./stat-cards";

export default function StatsRow() {
  const [stats, setStats] = useState<TranscriptStats | null>(null);

  useEffect(() => {
    getTranscriptStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4 mb-10">
      {statCards.map(({ label, icon: Icon, value }) => (
        <Card key={label} className="p-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-subtle text-accent mb-3.5">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="text-[28px] leading-none font-bold tabular-nums tracking-[-0.02em] text-text-primary">
            {stats ? value(stats) : "—"}
          </div>
          <div className="text-xs text-text-secondary mt-1.5">{label}</div>
        </Card>
      ))}
    </div>
  );
}
