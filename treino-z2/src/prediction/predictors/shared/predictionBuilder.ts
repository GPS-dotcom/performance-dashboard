import type { ModelOutput } from "../../models/predictionModel";
import type { Prediction, PredictionCategory, PredictionType } from "../../types/prediction";

// The single place every predictor assembles the final `Prediction<T>`
// envelope from a model's raw `ModelOutput<T>` -- mirrors
// insights/insightBuilder.ts's role in the Intelligence Engine (the one
// place `id`/`generatedAt`/`expiresAt` get derived, so that logic exists
// in exactly one place instead of being repeated in all ~21 predictor
// functions).

/**
 * How long each prediction category stays fresh before it should be
 * recalculated, in days. Race/fitness/threshold projections change
 * slowly (days of training barely move a 42-day trend); recovery and
 * readiness are inherently short-lived (today's TSB is tomorrow's stale
 * number); injury risk and goal probability sit in between.
 */
export const DEFAULT_TTL_DAYS_BY_CATEGORY: Record<PredictionCategory, number> = {
  race: 30,
  fitness: 14,
  threshold: 14,
  recovery: 1,
  injury_risk: 3,
  goal: 7,
  readiness: 1,
};

export interface BuildPredictionParams<T> {
  /** Stable, human-readable slug identifying which predictor produced this (e.g. "race_time_5k"). Combined with `generatedAt` and `idSuffix` to form `id`. */
  kind: string;
  predictionType: PredictionType;
  category: PredictionCategory;
  modelOutput: ModelOutput<T>;
  supportingMetrics: string[];
  supportingInsights?: string[];
  /** ISO timestamp this prediction is generated at -- always caller-supplied, never read from the system clock, so every predictor stays a deterministic pure function. */
  generatedAt: string;
  /** Overrides DEFAULT_TTL_DAYS_BY_CATEGORY for this specific prediction, when a predictor needs a different freshness window than its category's default. */
  ttlDaysOverride?: number;
  /** Extra id component so two different subjects (e.g. two different goals) of the same `kind`/date don't collide. */
  idSuffix?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function buildPrediction<T>(params: BuildPredictionParams<T>): Prediction<T> {
  const { modelOutput } = params;
  const id = ["prediction", params.kind, params.generatedAt.slice(0, 10), params.idSuffix].filter(Boolean).join(":");

  const ttlDays = params.ttlDaysOverride ?? DEFAULT_TTL_DAYS_BY_CATEGORY[params.category];
  const expiresAt = new Date(new Date(params.generatedAt).getTime() + ttlDays * 86400000).toISOString();

  const assumptions = [...modelOutput.assumptions, ...modelOutput.missingInputs.map((missing) => `missing/limited input: ${missing}`)];

  return {
    id,
    predictionType: params.predictionType,
    category: params.category,
    value: modelOutput.value,
    confidence: clamp01(modelOutput.confidence),
    lowerBound: modelOutput.lowerBound,
    upperBound: modelOutput.upperBound,
    supportingMetrics: params.supportingMetrics,
    supportingInsights: params.supportingInsights ?? [],
    assumptions,
    generatedAt: params.generatedAt,
    expiresAt,
  };
}
