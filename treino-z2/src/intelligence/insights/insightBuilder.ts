import { confidenceLevelFor } from "../rules/confidenceRules";
import { priorityFor } from "../rules/priorityRules";
import type { Insight, InsightCategory, InsightSeverity } from "../types/insight";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface BuildInsightParams {
  /** Stable, human-readable slug identifying which rule produced this (e.g. "fitness_trend_improving"). Combined with `date` and `metricName`/context to form `id`. */
  kind: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
  relatedMetrics: string[];
  date: string;
  /** Extra components folded into the id so two different subjects (e.g. two different shoes) of the same `kind`/date don't collide. */
  idSuffix?: string;
}

/**
 * The single place every analyzer/detector constructs an Insight. This
 * is what "Nenhum texto deve ser gerado diretamente" means in practice:
 * no analyzer assembles a raw Insight object itself -- title/description
 * come from insightTemplates.ts's deterministic, parameterized template
 * functions, and this builder is the only place that derives the
 * generated fields (id, confidenceLevel, priority, relatedRecommendations).
 */
export function buildInsight(params: BuildInsightParams): Insight {
  const confidence = clamp01(params.confidence);
  const id = ["insight", params.kind, params.date, params.idSuffix].filter(Boolean).join(":");

  return {
    id,
    category: params.category,
    priority: priorityFor(params.category, params.severity),
    title: params.title,
    description: params.description,
    evidence: params.evidence,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    relatedMetrics: params.relatedMetrics,
    date: params.date,
    severity: params.severity,
    // Always empty: see Insight.relatedRecommendations's own doc comment (DEC-0006).
    relatedRecommendations: [],
  };
}
