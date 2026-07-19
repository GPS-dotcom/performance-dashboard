import { heuristicBound } from "./shared/confidenceInterval";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";

export interface ReadinessModelInput {
  /** 0-100, from the Metrics Engine's Recovery Score. */
  recoveryScore: number | null;
  /** Training Stress Balance (fitness minus fatigue). */
  tsb: number | null;
  /** Acute:Chronic Workload Ratio (ATL/CTL). */
  acwr: number | null;
}

export interface ReadinessValue {
  readinessScore: number; // 0-100
  readinessLevel: "low" | "moderate" | "high";
}

// TSB's typical useful band (matches the clamp the Metrics Engine's own
// calculateRecoveryScore uses internally) -- mapped linearly to 0-100 so
// it can be combined with the other 0-100 components below.
const TSB_BAND_MIN = -30;
const TSB_BAND_MAX = 25;
// ACWR's cited "sweet spot" midpoint (Gabbett, 2016 -- see
// acwrInjuryRiskModel.ts) -- readiness peaks here and falls off linearly
// with distance from it in either direction.
const ACWR_SWEET_SPOT = 1.05;
const ACWR_FALLOFF_RANGE = 0.9; // distance from the sweet spot at which the ACWR component reaches 0
const MAX_SCORE_HALF_WIDTH = 15;

function tsbComponent(tsb: number): number {
  const clamped = Math.max(TSB_BAND_MIN, Math.min(TSB_BAND_MAX, tsb));
  return ((clamped - TSB_BAND_MIN) / (TSB_BAND_MAX - TSB_BAND_MIN)) * 100;
}

function acwrComponent(acwr: number): number {
  const distance = Math.abs(acwr - ACWR_SWEET_SPOT);
  return Math.max(0, 100 * (1 - distance / ACWR_FALLOFF_RANGE));
}

interface ReadinessInputs {
  recoveryScore: number | null;
  tsb: number | null;
  acwr: number | null;
}

/**
 * Weighted composite of three 0-100 components (Recovery Score, a
 * mapped TSB, a mapped ACWR). Shared by both readiness variants below --
 * only the weights differ, so the combining math exists in one place.
 * Components with a null input are excluded and the remaining weights
 * renormalized, rather than defaulting to a value that would silently
 * bias the score.
 */
function weightedReadiness(inputs: ReadinessInputs, weights: { recoveryScore: number; tsb: number; acwr: number }): { score: number; missingInputs: string[] } {
  const parts: { value: number; weight: number }[] = [];
  const missingInputs: string[] = [];

  if (inputs.recoveryScore != null) parts.push({ value: inputs.recoveryScore, weight: weights.recoveryScore });
  else missingInputs.push("recovery score");

  if (inputs.tsb != null) parts.push({ value: tsbComponent(inputs.tsb), weight: weights.tsb });
  else missingInputs.push("tsb");

  if (inputs.acwr != null) parts.push({ value: acwrComponent(inputs.acwr), weight: weights.acwr });
  else missingInputs.push("acwr");

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const score = totalWeight === 0 ? 0 : parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;
  return { score, missingInputs };
}

function levelFor(score: number): "low" | "moderate" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function toModelOutput(score: number, missingInputs: string[], rationale: string): ModelOutput<ReadinessValue> {
  const readinessLevel = levelFor(score);
  const confidence = Math.max(0.2, 0.85 - missingInputs.length * 0.2);
  const bound = heuristicBound(score, confidence, MAX_SCORE_HALF_WIDTH);
  return {
    value: { readinessScore: score, readinessLevel },
    confidence,
    lowerBound: Math.max(0, bound.lowerBound),
    upperBound: Math.min(100, bound.upperBound),
    assumptions: [rationale],
    missingInputs,
  };
}

/**
 * "prontidão para competir": weighted toward TSB (a taper's whole purpose
 * is a positive TSB on race day) and Recovery Score, with ACWR a lighter
 * signal (acute spikes matter less for a single race-day effort than for
 * sustained hard training).
 */
export function predictRaceReadiness(input: ReadinessModelInput): ModelOutput<ReadinessValue> {
  const { score, missingInputs } = weightedReadiness(input, { recoveryScore: 0.4, tsb: 0.45, acwr: 0.15 });
  return toModelOutput(score, missingInputs, "weighted 45% TSB, 40% Recovery Score, 15% ACWR -- race readiness prioritizes a positive taper (TSB) and current recovery");
}

export const raceReadinessModel: PredictionModel<ReadinessModelInput, ReadinessValue> = {
  modelId: "composite-race-readiness",
  version: "1.0.0",
  predict: predictRaceReadiness,
};

/**
 * "prontidão para treinos intensos": weighted toward Recovery Score and
 * ACWR (can the body absorb another hard session without spiking acute
 * load further?), with TSB a lighter signal -- a moderately negative TSB
 * mid-training-block is normal and doesn't by itself mean a hard session
 * should be skipped.
 */
export function predictHardTrainingReadiness(input: ReadinessModelInput): ModelOutput<ReadinessValue> {
  const { score, missingInputs } = weightedReadiness(input, { recoveryScore: 0.5, tsb: 0.15, acwr: 0.35 });
  return toModelOutput(score, missingInputs, "weighted 50% Recovery Score, 35% ACWR, 15% TSB -- hard-training readiness prioritizes current recovery and acute:chronic load balance");
}

export const hardTrainingReadinessModel: PredictionModel<ReadinessModelInput, ReadinessValue> = {
  modelId: "composite-hard-training-readiness",
  version: "1.0.0",
  predict: predictHardTrainingReadiness,
};
