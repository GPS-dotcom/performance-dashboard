import { atlDecayRecoveryModel, currentLoadImpactModel } from "../algorithms/atlDecayRecoveryModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { LoadImpactModelValue, RecoveryModelValue } from "../algorithms/atlDecayRecoveryModel";
import type { Prediction } from "../types/prediction";

/** Recovery Predictor (09_PREDICTION_ENGINE.md: "Recovery forecasts"). */

/** "dias até recuperação completa". */
export function predictRecoveryTime(ctl: number, atl: number, today: string): Prediction<RecoveryModelValue> {
  const modelOutput = atlDecayRecoveryModel.predict({ ctl, atl });
  return buildPrediction({
    kind: "recovery_time",
    predictionType: "recovery_time",
    category: "recovery",
    modelOutput,
    supportingMetrics: ["ctl", "atl"],
    generatedAt: today,
  });
}

/** "impacto da carga atual". */
export function predictCurrentLoadImpact(ctl: number, atl: number, currentDailyTss: number, today: string): Prediction<LoadImpactModelValue> {
  const modelOutput = currentLoadImpactModel.predict({ ctl, atl, currentDailyTss });
  return buildPrediction({
    kind: "current_load_impact",
    predictionType: "current_load_impact",
    category: "recovery",
    modelOutput,
    supportingMetrics: ["ctl", "atl"],
    generatedAt: today,
  });
}
