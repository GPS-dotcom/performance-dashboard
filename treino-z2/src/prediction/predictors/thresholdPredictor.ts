import { linearTrendModel } from "../algorithms/linearTrendModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { TrendModelValue } from "../algorithms/linearTrendModel";
import type { Prediction } from "../types/prediction";
import type { MetricSeriesPoint } from "../types/seriesTypes";

/**
 * Threshold Predictor (09_PREDICTION_ENGINE.md: "Threshold projections").
 * All four sub-capabilities are the same linear-trend extrapolation
 * (algorithms/linearTrendModel.ts) applied to four different Metrics
 * Engine series -- no separate math per threshold.
 */

/** "LT1". */
export function predictLt1Evolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({ kind: "lt1_evolution", predictionType: "lt1_evolution", category: "threshold", modelOutput, supportingMetrics: ["lt1"], generatedAt: today });
}

/** "LT2". */
export function predictLt2Evolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({ kind: "lt2_evolution", predictionType: "lt2_evolution", category: "threshold", modelOutput, supportingMetrics: ["lt2"], generatedAt: today });
}

/** "Critical Power". */
export function predictCriticalPowerEvolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({
    kind: "critical_power_evolution",
    predictionType: "critical_power_evolution",
    category: "threshold",
    modelOutput,
    supportingMetrics: ["critical_power"],
    generatedAt: today,
  });
}

/** "FTP". */
export function predictFtpEvolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({ kind: "ftp_evolution", predictionType: "ftp_evolution", category: "threshold", modelOutput, supportingMetrics: ["ftp"], generatedAt: today });
}
