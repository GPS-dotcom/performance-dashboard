// Mirrors treino-z2/src/metrics/calculators/trainingLoadCalculator.ts and
// shared/ewma.ts exactly (same formulas, same constants) -- duplicated here
// rather than imported because Edge Functions run on Deno, a separate
// runtime/bundle from the Vite app, and this project has no shared-package
// build step to bridge the two. If the Metrics Engine's formulas ever
// change, update both places -- see METRICS_ENGINE_REPORT.md for the
// citations behind these constants (Coggan's power-based TSS; Banister's
// CTL/ATL EWMA, tau=42/7 days).

export const CTL_TAU_DAYS = 42;
export const ATL_TAU_DAYS = 7;

export interface DailyLoad {
  date: string; // YYYY-MM-DD
  load: number;
}

/** Same three-tier fallback as trainingLoadCalculator.ts: power-based TSS, then HR-based, then null (no RPE input exists from Strava). */
export function computeSessionLoad(input: {
  durationSec: number;
  normalizedPowerWatts: number | null;
  ftpWatts: number | null;
  averageHeartRate: number | null;
  thresholdHeartRate: number | null;
}): number | null {
  if (!(input.durationSec > 0)) return null;

  if (input.normalizedPowerWatts && input.normalizedPowerWatts > 0 && input.ftpWatts && input.ftpWatts > 0) {
    const intensityFactor = input.normalizedPowerWatts / input.ftpWatts;
    return ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
  }

  if (input.averageHeartRate && input.averageHeartRate > 0 && input.thresholdHeartRate && input.thresholdHeartRate > 0) {
    const intensityFactor = input.averageHeartRate / input.thresholdHeartRate;
    return ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
  }

  return null;
}

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/** Same recurrence as shared/ewma.ts's exponentialMovingAverage: today = yesterday + (load - yesterday) / tauDays, gaps filled with load = 0. */
export function exponentialMovingAverage(dailyLoads: DailyLoad[], tauDays: number): DailyLoad[] {
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
  const series: DailyLoad[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const load = loadByDay.get(day) ?? 0;
    average += (load - average) / tauDays;
    series.push({ date: fromDayNumber(day), load: average });
  }
  return series;
}
