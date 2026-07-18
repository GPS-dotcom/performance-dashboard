import type { DailyTrainingLoad } from "../../models/dailyTrainingLoad";

export interface EwmaPoint {
  date: string;
  value: number;
}

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/**
 * Banister's exponentially-weighted moving average of a daily load
 * series with time constant `tauDays`: today = yesterday + (load -
 * yesterday) / tauDays. Shared by ctlCalculator (tau=42) and
 * atlCalculator (tau=7) -- the two metrics differ only in tau, so the
 * recurrence itself lives in exactly one place. Days with no entry in
 * `dailyLoads` are treated as load = 0 (a rest day still lets the average
 * decay), so gaps in the input are filled automatically rather than
 * skipped, keeping the day-to-day spacing of the recurrence correct.
 */
export function exponentialMovingAverage(dailyLoads: DailyTrainingLoad[], tauDays: number): EwmaPoint[] {
  if (dailyLoads.length === 0) return [];

  const sorted = [...dailyLoads].sort((a, b) => a.date.localeCompare(b.date));
  const startDay = toDayNumber(sorted[0].date);
  const endDay = toDayNumber(sorted[sorted.length - 1].date);

  const loadByDay = new Map<number, number>();
  for (const entry of sorted) {
    const day = toDayNumber(entry.date);
    loadByDay.set(day, (loadByDay.get(day) ?? 0) + entry.load);
  }

  let average = 0;
  const series: EwmaPoint[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const load = loadByDay.get(day) ?? 0;
    average += (load - average) / tauDays;
    series.push({ date: fromDayNumber(day), value: average });
  }
  return series;
}
