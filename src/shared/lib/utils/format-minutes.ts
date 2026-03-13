export default function formatMinutes(minutes: number): string {
  if (minutes < 60) return `~${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h ${mins}m`;
}
