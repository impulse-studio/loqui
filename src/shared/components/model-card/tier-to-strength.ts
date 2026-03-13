export default function tierToStrength(tier: string): number {
  if (tier === "very-high") return 4;
  if (tier === "high") return 3;
  if (tier === "medium") return 2;
  return 1;
}
