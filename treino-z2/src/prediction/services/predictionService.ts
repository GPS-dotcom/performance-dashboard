import { fetchRecentPredictions, savePrediction } from "../repositories/predictionRepository";
import type { Prediction } from "../types/prediction";

/**
 * Orchestration entry point: persists a batch of already-generated
 * predictions (from any combination of predictors) and reports how many
 * succeeded. Each predictor stays a pure function that returns a
 * `Prediction<T>` -- callers (e.g. hooks/assembleDailyBrief.ts) decide
 * which predictors to run over which data, then hand the results here to
 * persist. Mirrors the Intelligence Engine's intelligenceService.ts.
 */
export async function persistPredictions(athleteId: string, predictions: Prediction<unknown>[]): Promise<number> {
  let savedCount = 0;
  for (const prediction of predictions) {
    const result = await savePrediction(athleteId, prediction);
    if (result) savedCount++;
  }
  return savedCount;
}

/** Reads back an athlete's most recent predictions, already sorted by recency (see predictionRepository). */
export async function getPredictionHistory(athleteId: string, limit = 50): Promise<Prediction<unknown>[]> {
  return fetchRecentPredictions(athleteId, limit);
}
