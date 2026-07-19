import type { DailyTrainingLoad } from "../models/dailyTrainingLoad";
import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { exponentialMovingAverage, type EwmaPoint } from "./shared/ewma";

/** Standard Banister CTL time constant, in days (Banister, 1975; the value used across TrainingPeaks/WKO). */
export const CTL_TIME_CONSTANT_DAYS = 42;

/**
 * CTL (Chronic Training Load, colloquially "Fitness") via Banister's
 * exponentially-weighted moving average of daily Training Load with a
 * 42-day time constant: ctl[today] = ctl[yesterday] + (load[today] -
 * ctl[yesterday]) / 42. Represents a rolling ~6-week average of training
 * stress, weighted toward more recent days.
 */
export function calculateCtl(dailyLoads: DailyTrainingLoad[]): MetricResult<EwmaPoint[]> {
  const requiredInputs = ["daily Training Load series (>= 1 day, from trainingLoadCalculator)"];
  if (dailyLoads.length === 0) return unavailableMetric(requiredInputs, ["no daily load data"]);

  const series = exponentialMovingAverage(dailyLoads, CTL_TIME_CONSTANT_DAYS);
  const spanDays = series.length;

  const dataQuality: "high" | "medium" | "low" = spanDays >= CTL_TIME_CONSTANT_DAYS ? "high" : spanDays >= 14 ? "medium" : "low";
  const missingInputs =
    spanDays < CTL_TIME_CONSTANT_DAYS
      ? [`fewer than ${CTL_TIME_CONSTANT_DAYS} days of history -- CTL underestimates true chronic load until then`]
      : [];

  return metricResult(series, Math.min(1, spanDays / CTL_TIME_CONSTANT_DAYS), dataQuality, requiredInputs, missingInputs);
}
