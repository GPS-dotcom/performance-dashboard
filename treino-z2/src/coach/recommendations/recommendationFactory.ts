import { clamp01 } from "../validators/guards";
import type { Recommendation, RecommendationPriority, RecommendationType } from "../types/recommendation";

// Factory Pattern (explicitly requested: "Utilizar Factory Pattern para
// geração de recomendações"). This is the only place a Recommendation
// object is assembled -- every generator in this directory calls
// `RecommendationFactory.create(...)` instead of building the object
// literal itself, so `id` derivation and confidence clamping happen in
// exactly one place, the same role `insightBuilder.ts`/`buildPrediction`
// play in the Intelligence/Prediction Engines.

export interface CreateRecommendationParams {
  type: RecommendationType;
  /** Stable, human-readable slug identifying which rule produced this (e.g. "recovery_day"). Combined with `createdAt` and `idSuffix` to form `id`. */
  kind: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  reasoning: string;
  supportingMetrics: string[];
  supportingInsights?: string[];
  supportingPredictions?: string[];
  confidence: number;
  createdAt: string;
  /** Extra id component so two different subjects of the same kind/date don't collide. */
  idSuffix?: string;
}

export class RecommendationFactory {
  static create(params: CreateRecommendationParams): Recommendation {
    const id = ["recommendation", params.kind, params.createdAt.slice(0, 10), params.idSuffix].filter(Boolean).join(":");

    return {
      id,
      type: params.type,
      priority: params.priority,
      title: params.title,
      description: params.description,
      reasoning: params.reasoning,
      supportingMetrics: params.supportingMetrics,
      supportingInsights: params.supportingInsights ?? [],
      supportingPredictions: params.supportingPredictions ?? [],
      confidence: clamp01(params.confidence),
      createdAt: params.createdAt,
    };
  }
}
