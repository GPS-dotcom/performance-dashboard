import { hardTrainingReadinessModel, raceReadinessModel } from "../algorithms/readinessModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { ReadinessModelInput, ReadinessValue } from "../algorithms/readinessModel";
import type { Prediction } from "../types/prediction";

/** Readiness Predictor (09_PREDICTION_ENGINE.md: "Readiness forecasts"). */

/** "prontidão para competir". */
export function predictRaceReadiness(input: ReadinessModelInput, today: string): Prediction<ReadinessValue> {
  const modelOutput = raceReadinessModel.predict(input);
  return buildPrediction({
    kind: "readiness_race",
    predictionType: "readiness_race",
    category: "readiness",
    modelOutput,
    supportingMetrics: ["recovery_score", "tsb", "acwr"],
    generatedAt: today,
  });
}

/** "prontidão para treinos intensos". */
export function predictHardTrainingReadiness(input: ReadinessModelInput, today: string): Prediction<ReadinessValue> {
  const modelOutput = hardTrainingReadinessModel.predict(input);
  return buildPrediction({
    kind: "readiness_hard_training",
    predictionType: "readiness_hard_training",
    category: "readiness",
    modelOutput,
    supportingMetrics: ["recovery_score", "tsb", "acwr"],
    generatedAt: today,
  });
}
