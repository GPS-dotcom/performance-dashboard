import { riegelRaceModel } from "../algorithms/riegelRaceModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { RaceModelValue } from "../algorithms/riegelRaceModel";
import type { Prediction, PredictionType } from "../types/prediction";
import type { BestEffort } from "../types/seriesTypes";

/**
 * Race Predictor (09_PREDICTION_ENGINE.md: "Race time predictions").
 * Every distance below is the same question (Riegel extrapolation from
 * recorded best efforts) asked at 6 different target distances, so
 * `predictRaceTime` is the one implementation every named function below
 * wraps -- matching the Trend Analyzer/linearTrendModel pattern already
 * established in the Intelligence Engine and this engine's own Fitness/
 * Threshold Predictors.
 */

export const RACE_DISTANCES_KM = {
  fiveK: 5,
  tenK: 10,
  fifteenK: 15,
  halfMarathon: 21.0975,
  thirtyK: 30,
  marathon: 42.195,
} as const;

const PREDICTION_TYPE_BY_DISTANCE_KEY: Record<keyof typeof RACE_DISTANCES_KM, PredictionType> = {
  fiveK: "race_time_5k",
  tenK: "race_time_10k",
  fifteenK: "race_time_15k",
  halfMarathon: "race_time_21k",
  thirtyK: "race_time_30k",
  marathon: "race_time_marathon",
};

export function predictRaceTime(
  distanceKey: keyof typeof RACE_DISTANCES_KM,
  bestEfforts: BestEffort[],
  today: string,
): Prediction<RaceModelValue> {
  const targetDistanceKm = RACE_DISTANCES_KM[distanceKey];
  const modelOutput = riegelRaceModel.predict({ targetDistanceKm, bestEfforts });

  return buildPrediction({
    kind: `race_${distanceKey}`,
    predictionType: PREDICTION_TYPE_BY_DISTANCE_KEY[distanceKey],
    category: "race",
    modelOutput,
    supportingMetrics: ["best_effort"],
    generatedAt: today,
  });
}

export function predictRace5K(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("fiveK", bestEfforts, today);
}

export function predictRace10K(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("tenK", bestEfforts, today);
}

export function predictRace15K(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("fifteenK", bestEfforts, today);
}

export function predictRace21K(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("halfMarathon", bestEfforts, today);
}

export function predictRace30K(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("thirtyK", bestEfforts, today);
}

export function predictRaceMarathon(bestEfforts: BestEffort[], today: string): Prediction<RaceModelValue> {
  return predictRaceTime("marathon", bestEfforts, today);
}
