import { Type, Gauge, Mic, Clock, type LucideIcon } from "lucide-react";
import formatNumber from "../../shared/lib/utils/format-number";
import formatMinutes from "../../shared/lib/utils/format-minutes";
import type { TranscriptStats } from "../../shared/types/transcript";

export interface StatCard {
  label: string;
  icon: LucideIcon;
  value: (stats: TranscriptStats) => string;
}

const statCards: StatCard[] = [
  { label: "words total", icon: Type, value: (s) => formatNumber(s.totalWords) },
  { label: "w/sec avg", icon: Gauge, value: (s) => s.avgWordsPerSecond.toFixed(1) },
  { label: "transcriptions", icon: Mic, value: (s) => formatNumber(s.totalTranscripts) },
  { label: "time saved", icon: Clock, value: (s) => formatMinutes(s.timeSavedMinutes) },
];

export default statCards;
