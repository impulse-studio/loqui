import { useEffect, useState } from "react";
import Card from "../../shared/components/card";
import { getTranscriptStats } from "../../shared/lib/tauri-commands";
import type { TranscriptStats } from "../../shared/types/transcript";
import formatNumber from "../../shared/lib/utils/format-number";
import formatMinutes from "../../shared/lib/utils/format-minutes";
import statPlaceholders from "./stat-placeholders";

export default function StatsRow() {
  const [stats, setStats] = useState<TranscriptStats | null>(null);

  useEffect(() => {
    getTranscriptStats().then(setStats).catch(console.error);
  }, []);

  const items = stats
    ? [
        { value: formatNumber(stats.totalWords), label: "words total" },
        { value: `${stats.avgWordsPerSecond.toFixed(1)}`, label: "w/sec avg" },
        { value: formatNumber(stats.totalTranscripts), label: "transcriptions" },
        { value: formatMinutes(stats.timeSavedMinutes), label: "time saved" },
      ]
    : statPlaceholders;

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {items.map((stat) => (
        <Card key={stat.label} className="px-5 py-4">
          <div className="text-2xl font-bold text-text-primary">
            {stat.value}
          </div>
          <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
        </Card>
      ))}
    </div>
  );
}
