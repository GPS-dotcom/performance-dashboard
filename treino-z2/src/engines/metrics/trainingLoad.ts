import { metricResult, unavailableMetric, type MetricResult } from "./metricResult";

export interface DailyLoad {
  date: string; // YYYY-MM-DD
  tss: number;
}

export interface TrainingLoadPoint {
  date: string;
  ctl: number; // Chronic Training Load ("Fitness")
  atl: number; // Acute Training Load ("Fatigue")
  tsb: number; // Training Stress Balance ("Form") = ctl - atl
}

export const CTL_TIME_CONSTANT_DAYS = 42;
export const ATL_TIME_CONSTANT_DAYS = 7;

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/**
 * CTL/ATL/TSB via the standard Banister exponentially-weighted moving
 * average model (the same one used across the sports-science/TrainingPeaks
 * ecosystem): each day, ctl += (tss - ctl) / 42, atl += (tss - atl) / 7,
 * tsb = ctl - atl. Days with no activity contribute tss = 0 (a rest day
 * still lets CTL/ATL decay), so gaps in the input series are filled
 * automatically rather than skipped.
 */
export function calculateTrainingLoadSeries(dailyLoads: DailyLoad[]): MetricResult<TrainingLoadPoint[]> {
  const requiredInputs = ["daily TSS/rTSS series (>= 1 day)"];
  if (dailyLoads.length === 0) {
    return unavailableMetric(requiredInputs, ["no daily load data"]);
  }

  const sorted = [...dailyLoads].sort((a, b) => a.date.localeCompare(b.date));
  const startDay = toDayNumber(sorted[0].date);
  const endDay = toDayNumber(sorted[sorted.length - 1].date);

  const tssByDay = new Map<number, number>();
  for (const load of sorted) {
    const day = toDayNumber(load.date);
    tssByDay.set(day, (tssByDay.get(day) ?? 0) + load.tss);
  }

  let ctl = 0;
  let atl = 0;
  const series: TrainingLoadPoint[] = [];

  for (let day = startDay; day <= endDay; day++) {
    const tss = tssByDay.get(day) ?? 0;
    ctl += (tss - ctl) / CTL_TIME_CONSTANT_DAYS;
    atl += (tss - atl) / ATL_TIME_CONSTANT_DAYS;
    series.push({ date: fromDayNumber(day), ctl, atl, tsb: ctl - atl });
  }

  const spanDays = endDay - startDay + 1;
  const dataQuality: "high" | "medium" | "low" =
    spanDays >= CTL_TIME_CONSTANT_DAYS ? "high" : spanDays >= ATL_TIME_CONSTANT_DAYS ? "medium" : "low";
  const missingInputs =
    spanDays < CTL_TIME_CONSTANT_DAYS
      ? [`fewer than ${CTL_TIME_CONSTANT_DAYS} days of history -- CTL underestimates true chronic load until then`]
      : [];

  return metricResult(series, Math.min(1, spanDays / CTL_TIME_CONSTANT_DAYS), dataQuality, requiredInputs, missingInputs);
}

/** Convenience wrapper: just the most recent CTL/ATL/TSB point. */
export function latestTrainingLoad(dailyLoads: DailyLoad[]): MetricResult<TrainingLoadPoint> {
  const series = calculateTrainingLoadSeries(dailyLoads);
  if (!series.value || series.value.length === 0) {
    return unavailableMetric(series.requiredInputs, series.missingInputs);
  }
  const latest = series.value[series.value.length - 1];
  return metricResult(latest, series.confidence, series.dataQuality, series.requiredInputs, series.missingInputs);
}
