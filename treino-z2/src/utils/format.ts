export function formatPace(minPerKm: number | null): string {
  if (minPerKm == null) return "–";
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}
