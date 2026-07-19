// Coach Engine's Recommendation envelope. Per 10_COACH_ENGINE.md's
// "Recommendation Rules": "Every recommendation must contain:
// Recommendation, Reason, Evidence, Confidence, Expected Outcome" plus
// "Explainability"'s "Alternative" -- restated here in the exact shape
// requested for this rebuild (id, type, priority, title, description,
// reasoning, supportingMetrics, supportingInsights, supportingPredictions,
// confidence, createdAt). `reasoning` plays the role of the old
// "Reason"+"Evidence" combined into one explainable narrative;
// `supportingMetrics`/`supportingInsights`/`supportingPredictions` make
// explicit which upstream engine outputs a recommendation is grounded in
// -- "Toda recomendação deve referenciar métricas e insights."

/** The 7 requested Recommendation Engine sub-types. */
export type RecommendationType = "recovery" | "intensity" | "volume" | "rest" | "nutrition" | "hydration" | "race_strategy";

/** 1 = most urgent, 5 = least urgent. */
export type RecommendationPriority = 1 | 2 | 3 | 4 | 5;

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  /** Explains *how* this recommendation was derived from the signals below -- never left implicit. */
  reasoning: string;
  /** Names of Metrics Engine outputs this recommendation is grounded in. */
  supportingMetrics: string[];
  /** Ids of Intelligence Engine Insights this recommendation is grounded in, when supplied by the caller. */
  supportingInsights: string[];
  /** Ids of Prediction Engine Predictions this recommendation is grounded in, when supplied by the caller. */
  supportingPredictions: string[];
  /** 0-1. */
  confidence: number;
  /** ISO timestamp, always caller-supplied -- never read from the system clock. */
  createdAt: string;
}
