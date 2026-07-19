import type { DailyTrainingLoad } from "../models/dailyTrainingLoad";
import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { exponentialMovingAverage, type EwmaPoint } from "./shared/ewma";

/** Standard Banister ATL time constant, in days (Banister, 1975; the value used across TrainingPeaks/WKO). */
export const ATL_TIME_CONSTANT_DAYS = 7;

/**
 * ATL (Acute Training Load, colloquially "Fatigue") via Banister's
 * exponentially-weighted moving average of daily Training Load with a
 * 7-day time constant: atl[today] = atl[yesterday] + (load[today] -
 * atl[yesterday]) / 7. Represents a rolling ~1-week average of training
 * stress -- the same recurrence as CTL, just far more reactive to recent
 * days because of the shorter time constant.
 */
export function calculateAtl(dailyLoads: DailyTrainingLoad[]): MetricResult<EwmaPoint[]> {
  const requiredInputs = ["daily Training Load series (>= 1 day, from trainingLoadCalculator)"];
  if (dailyLoads.length === 0) return unavailableMetric(requiredInputs, ["no daily load data"]);

  const series = exponentialMovingAverage(dailyLoads, ATL_TIME_CONSTANT_DAYS);
  const spanDays = series.length;

  const dataQuality: "high" | "medium" | "low" = spanDays >= ATL_TIME_CONSTANT_DAYS ? "high" : "low";
  const missingInputs =
    spanDays < ATL_TIME_CONSTANT_DAYS
      ? [`fewer than ${ATL_TIME_CONSTANT_DAYS} days of history -- ATL underestimates true acute load until then`]
      : [];

  return metricResult(series, Math.min(1, spanDays / ATL_TIME_CONSTANT_DAYS), dataQuality, requiredInputs, missingInputs);
}
