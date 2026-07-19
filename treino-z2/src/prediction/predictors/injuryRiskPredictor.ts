import { acwrInjuryRiskModel } from "../algorithms/acwrInjuryRiskModel";
import { accumulatedFatigueRiskModel } from "../algorithms/accumulatedFatigueRiskModel";
import { monotonyStrainModel } from "../algorithms/monotonyStrainModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { AcuteLoadRiskValue } from "../algorithms/acwrInjuryRiskModel";
import type { InjuryRiskValue } from "../algorithms/shared/injuryRiskValue";
import type { MonotonyRiskValue } from "../algorithms/monotonyStrainModel";
import type { Prediction } from "../types/prediction";
import type { MetricSeriesPoint } from "../types/seriesTypes";

/**
 * Injury Risk Predictor (09_PREDICTION_ENGINE.md: "Injury risk
 * forecasts"). Three independent signals, each its own algorithm (see
 * algorithms/{acwrInjuryRiskModel,monotonyStrainModel,accumulatedFatigueRiskModel}.ts
 * for the citations and formulas) -- deliberately not combined into one
 * composite score, so a caller can see which specific risk factor (acute
 * spike, monotony, sustained fatigue) is driving concern.
 */

/** "risco por carga aguda". */
export function predictAcuteLoadRisk(ctl: number, atl: number, today: string): Prediction<AcuteLoadRiskValue> {
  const modelOutput = acwrInjuryRiskModel.predict({ ctl, atl });
  return buildPrediction({
    kind: "injury_risk_acute_load",
    predictionType: "injury_risk_acute_load",
    category: "injury_risk",
    modelOutput,
    supportingMetrics: ["ctl", "atl"],
    generatedAt: today,
  });
}

/** "risco por monotonia". */
export function predictMonotonyRisk(dailyLoads: number[], today: string): Prediction<MonotonyRiskValue> {
  const modelOutput = monotonyStrainModel.predict({ dailyLoads });
  return buildPrediction({
    kind: "injury_risk_monotony",
    predictionType: "injury_risk_monotony",
    category: "injury_risk",
    modelOutput,
    supportingMetrics: ["daily_training_load"],
    generatedAt: today,
  });
}

/** "risco por fadiga acumulada". */
export function predictAccumulatedFatigueRisk(tsbSeries: MetricSeriesPoint[], today: string): Prediction<InjuryRiskValue> {
  const modelOutput = accumulatedFatigueRiskModel.predict({ tsbSeries });
  return buildPrediction({
    kind: "injury_risk_accumulated_fatigue",
    predictionType: "injury_risk_accumulated_fatigue",
    category: "injury_risk",
    modelOutput,
    supportingMetrics: ["tsb"],
    generatedAt: today,
  });
}
