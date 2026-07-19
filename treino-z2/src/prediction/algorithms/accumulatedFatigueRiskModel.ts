import { heuristicBound } from "./shared/confidenceInterval";
import type { InjuryRiskValue } from "./shared/injuryRiskValue";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";
import type { MetricSeriesPoint } from "../types/seriesTypes";

export interface AccumulatedFatigueRiskInput {
  /** Recent TSB (Training Stress Balance) history, most days included, sorted or not. */
  tsbSeries: MetricSeriesPoint[];
}

const MIN_DAYS = 5;
// Independent of, and deliberately not shared with, the Intelligence
// Engine's `fatigueAnalyzer.analyzeAccumulatedFatigue` -- that module
// *describes* a past/current state ("fatigue has been elevated"); this
// one *forecasts* injury-risk probability from the same underlying
// signal (sustained negative TSB), for a different consumer and a
// different question. Per docs/ARCHITECTURE.md, "engines communicate
// through contracts, never direct dependencies" -- the Prediction Engine
// does not import the Intelligence Engine's rules, so this threshold is
// independently chosen and documented here rather than reused.
const SUSTAINED_TSB_THRESHOLD = -15;
const CRITICAL_TSB_THRESHOLD = -25;
const MAX_SCORE_HALF_WIDTH = 20;

/**
 * Predicts injury risk from how long, and how deeply, TSB (Training
 * Stress Balance -- fitness minus fatigue) has stayed negative. Sustained
 * negative TSB means an athlete has been accumulating fatigue faster than
 * they recover from it; the sports-science literature (see
 * acwrInjuryRiskModel.ts's Gabbett 2016 citation, and Foster 1998 for
 * monotony/strain) treats sustained accumulated fatigue as a contributing
 * risk factor alongside acute load spikes and training monotony -- this
 * model is the third, independent signal of the three requested for
 * Injury Risk Predictor.
 */
export function predictAccumulatedFatigueRisk(input: AccumulatedFatigueRiskInput): ModelOutput<InjuryRiskValue> {
  const sorted = [...input.tsbSeries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < MIN_DAYS) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: [`fewer than ${MIN_DAYS} days of TSB history`] };
  }

  let consecutiveDays = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].value <= SUSTAINED_TSB_THRESHOLD) consecutiveDays++;
    else break;
  }

  const latestTsb = sorted[sorted.length - 1].value;

  let riskLevel: "low" | "moderate" | "high";
  let riskScore: number;
  if (consecutiveDays === 0) {
    riskLevel = "low";
    riskScore = 15;
  } else if (latestTsb <= CRITICAL_TSB_THRESHOLD && consecutiveDays >= MIN_DAYS) {
    riskLevel = "high";
    riskScore = Math.min(100, 70 + consecutiveDays * 3);
  } else {
    riskLevel = "moderate";
    riskScore = 40 + Math.min(20, consecutiveDays * 2);
  }

  const confidence = Math.min(0.8, 0.4 + consecutiveDays * 0.05);
  const bound = heuristicBound(riskScore, confidence, MAX_SCORE_HALF_WIDTH);

  return {
    value: { riskScore, riskLevel },
    confidence,
    lowerBound: Math.max(0, bound.lowerBound),
    upperBound: Math.min(100, bound.upperBound),
    assumptions: [`TSB at/below ${SUSTAINED_TSB_THRESHOLD} for ${consecutiveDays} consecutive day(s) (latest TSB ${latestTsb.toFixed(1)})`],
    missingInputs: ["additional signals (HRV, sleep, prior injury history, subjective wellness) would improve this estimate"],
  };
}

export const accumulatedFatigueRiskModel: PredictionModel<AccumulatedFatigueRiskInput, InjuryRiskValue> = {
  modelId: "sustained-tsb-injury-risk",
  version: "1.0.0",
  predict: predictAccumulatedFatigueRisk,
};
