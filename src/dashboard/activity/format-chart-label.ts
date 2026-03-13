export default function formatChartLabel(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  if (days <= 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (days <= 30) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short" });
}
