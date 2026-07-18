export function formatPace(minPerKm: number | null): string {
  if (minPerKm == null) return "–";
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

/** Formats a duration in seconds as H:MM:SS (or M:SS under an hour). */
export function formatDuration(totalSec: number | null): string {
  if (totalSec == null) return "–";
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
