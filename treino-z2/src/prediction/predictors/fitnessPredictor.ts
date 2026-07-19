import { linearTrendModel } from "../algorithms/linearTrendModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { TrendModelValue } from "../algorithms/linearTrendModel";
import type { Prediction } from "../types/prediction";
import type { MetricSeriesPoint } from "../types/seriesTypes";

/**
 * Fitness Predictor (09_PREDICTION_ENGINE.md: "Fitness trajectory
 * forecasts"). All three sub-capabilities are the same linear-trend
 * extrapolation (algorithms/linearTrendModel.ts) applied to three
 * different Metrics Engine series -- no separate math per metric.
 */

/** "evolução do CTL". */
export function predictCtlEvolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({
    kind: "ctl_evolution",
    predictionType: "ctl_evolution",
    category: "fitness",
    modelOutput,
    supportingMetrics: ["ctl"],
    generatedAt: today,
  });
}

/** "evolução da Fitness Score". */
export function predictFitnessScoreEvolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({
    kind: "fitness_score_evolution",
    predictionType: "fitness_score_evolution",
    category: "fitness",
    modelOutput,
    supportingMetrics: ["fitness_score"],
    generatedAt: today,
  });
}

/** "evolução do Running Effectiveness". */
export function predictRunningEffectivenessEvolution(series: MetricSeriesPoint[], daysAhead: number, today: string): Prediction<TrendModelValue> {
  const modelOutput = linearTrendModel.predict({ series, daysAhead });
  return buildPrediction({
    kind: "running_effectiveness_evolution",
    predictionType: "running_effectiveness_evolution",
    category: "fitness",
    modelOutput,
    supportingMetrics: ["running_effectiveness"],
    generatedAt: today,
  });
}
