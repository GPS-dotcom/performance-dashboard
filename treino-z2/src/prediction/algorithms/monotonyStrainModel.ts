import { heuristicBound } from "./shared/confidenceInterval";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";

export interface MonotonyModelInput {
  /** Daily training load (e.g. TSS-equivalent) for each of the most recent days -- at least MIN_DAYS_FOR_MONOTONY. */
  dailyLoads: number[];
}

export interface MonotonyRiskValue {
  monotony: number;
  strain: number;
  /** 0-100. */
  riskScore: number;
  riskLevel: "low" | "moderate" | "high";
}

const MIN_DAYS_FOR_MONOTONY = 7;
// Foster, C. (1998), "Monitoring training in athletes with reference to
// overtraining syndrome", Medicine & Science in Sports & Exercise 30(7);
// Foster et al. (2001), "A new approach to monitoring exercise training".
// Monotony = mean(daily load) / stddev(daily load) -- a week of
// identical daily loads (no variation) has very high (undefined at the
// limit) monotony even at modest volume, and is associated with elevated
// illness/overtraining risk independent of how hard any single day was.
// Strain = weekly total load * monotony, Foster's composite "how hard and
// how relentless" measure.
const MONOTONY_MODERATE_THRESHOLD = 1.5;
const MONOTONY_HIGH_THRESHOLD = 2.0;
const MAX_SCORE_HALF_WIDTH = 20;

function stddev(values: number[], mean: number): number {
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/**
 * Predicts injury/overtraining risk from Foster's Training Monotony:
 * a week of unvarying daily load (low day-to-day variability) is riskier
 * than the same total load spread unevenly (hard days + easy/rest days),
 * even though total volume is identical -- monotony captures that
 * variability signal, which ACWR (a ratio of two averages) doesn't.
 */
export function predictMonotonyRisk(input: MonotonyModelInput): ModelOutput<MonotonyRiskValue> {
  const { dailyLoads } = input;
  if (dailyLoads.length < MIN_DAYS_FOR_MONOTONY) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: [`fewer than ${MIN_DAYS_FOR_MONOTONY} days of daily load data`] };
  }

  const mean = dailyLoads.reduce((s, v) => s + v, 0) / dailyLoads.length;
  const sd = stddev(dailyLoads, mean);
  const total = dailyLoads.reduce((s, v) => s + v, 0);

  if (sd === 0) {
    // No day-to-day variability at all -- monotony is unbounded; report
    // it as maximally high rather than dividing by zero.
    const strain = total * MONOTONY_HIGH_THRESHOLD * 5;
    return {
      value: { monotony: Infinity, strain, riskScore: 100, riskLevel: "high" },
      confidence: 0.6,
      lowerBound: 90,
      upperBound: 100,
      assumptions: ["daily load had zero variability over the window -- monotony is mathematically unbounded, reported as maximal risk"],
      missingInputs: [],
    };
  }

  const monotony = mean / sd;
  const strain = total * monotony;

  let riskLevel: "low" | "moderate" | "high";
  let riskScore: number;
  if (monotony >= MONOTONY_HIGH_THRESHOLD) {
    riskLevel = "high";
    riskScore = Math.min(100, 70 + (monotony - MONOTONY_HIGH_THRESHOLD) * 20);
  } else if (monotony >= MONOTONY_MODERATE_THRESHOLD) {
    riskLevel = "moderate";
    riskScore = 45;
  } else {
    riskLevel = "low";
    riskScore = 20;
  }

  const bound = heuristicBound(riskScore, 0.65, MAX_SCORE_HALF_WIDTH);
  return {
    value: { monotony, strain, riskScore, riskLevel },
    confidence: 0.65,
    lowerBound: Math.max(0, bound.lowerBound),
    upperBound: Math.min(100, bound.upperBound),
    assumptions: [`monotony = mean/stddev of the last ${dailyLoads.length} days' load = ${monotony.toFixed(2)} (Foster, 1998); moderate >= ${MONOTONY_MODERATE_THRESHOLD}, high >= ${MONOTONY_HIGH_THRESHOLD}`],
    missingInputs: [],
  };
}

export const monotonyStrainModel: PredictionModel<MonotonyModelInput, MonotonyRiskValue> = {
  modelId: "foster-monotony-strain",
  version: "1.0.0",
  predict: predictMonotonyRisk,
};
