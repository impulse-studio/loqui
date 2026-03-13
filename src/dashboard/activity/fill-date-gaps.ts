import type { ActivityPoint } from "../../shared/types/transcript";

export default function fillDateGaps(data: ActivityPoint[], days: number): ActivityPoint[] {
  const map = new Map(data.map((d) => [d.date, d]));
  const result: ActivityPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(map.get(key) ?? { date: key, count: 0, words: 0 });
  }

  return result;
}
