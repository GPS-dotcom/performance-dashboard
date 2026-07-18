import { calculateAtl } from "../calculators/atlCalculator";
import { calculateCtl } from "../calculators/ctlCalculator";
import { calculateTsb } from "../calculators/tsbCalculator";
import type { DailyTrainingLoad } from "../models/dailyTrainingLoad";
import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";

export interface TrainingLoadPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

/**
 * Composes calculateCtl, calculateAtl and calculateTsb into the full
 * day-by-day Training Load trend over a daily load series. Each of the
 * three underlying calculators is independently callable and
 * independently tested (per calculator) -- this analyzer's only job is
 * combining their per-day outputs into one series, which is why it lives
 * in analyzers/ rather than being a 4th calculator.
 */
export function analyzeTrainingLoadTrend(dailyLoads: DailyTrainingLoad[]): MetricResult<TrainingLoadPoint[]> {
  const requiredInputs = ["daily Training Load series (>= 1 day, from trainingLoadCalculator)"];
  if (dailyLoads.length === 0) return unavailableMetric(requiredInputs, ["no daily load data"]);

  const ctlResult = calculateCtl(dailyLoads);
  const atlResult = calculateAtl(dailyLoads);

  if (!ctlResult.value || !atlResult.value) {
    return unavailableMetric(requiredInputs, [...ctlResult.missingInputs, ...atlResult.missingInputs]);
  }

  // calculateCtl/calculateAtl derive their series from the same sorted,
  // gap-filled day range built from the same `dailyLoads` input, so they
  // always produce the same dates in the same order -- zipping by index
  // is safe.
  const series: TrainingLoadPoint[] = ctlResult.value.map((ctlPoint, i) => {
    const atlPoint = atlResult.value![i];
    const tsb = calculateTsb(ctlPoint.value, atlPoint.value);
    return { date: ctlPoint.date, ctl: ctlPoint.value, atl: atlPoint.value, tsb: tsb.value! };
  });

  const confidence = Math.min(ctlResult.confidence, atlResult.confidence);
  const dataQuality = ctlResult.dataQuality === "high" && atlResult.dataQuality === "high" ? "high" : ctlResult.dataQuality === "low" || atlResult.dataQuality === "low" ? "low" : "medium";
  const missingInputs = [...new Set([...ctlResult.missingInputs, ...atlResult.missingInputs])];

  return metricResult(series, confidence, dataQuality, requiredInputs, missingInputs);
}

/** Convenience: just the most recent CTL/ATL/TSB point. */
export function latestTrainingLoadPoint(dailyLoads: DailyTrainingLoad[]): MetricResult<TrainingLoadPoint> {
  const series = analyzeTrainingLoadTrend(dailyLoads);
  if (!series.value || series.value.length === 0) {
    return unavailableMetric(series.requiredInputs, series.missingInputs);
  }
  const latest = series.value[series.value.length - 1];
  return metricResult(latest, series.confidence, series.dataQuality, series.requiredInputs, series.missingInputs);
}
