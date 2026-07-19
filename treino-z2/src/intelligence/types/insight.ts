// Insight structure per 19_INSIGHTS_LIBRARY.md's "Insight Structure":
// "Every insight contains: Title, Category, Description, Evidence,
// Confidence, Severity, Timestamp, Related Metrics, Suggested Action
// (optional)." Extended here with `id` and `priority` for a UI/API that
// needs to key and order insights, per "Insight Prioritization".

/** 19_INSIGHTS_LIBRARY.md, "Categories". */
export type InsightCategory =
  | "fitness"
  | "recovery"
  | "training_load"
  | "performance"
  | "efficiency"
  | "physiology"
  | "consistency"
  | "race_readiness"
  | "injury_risk"
  | "equipment";

/** 19_INSIGHTS_LIBRARY.md, "Severity Levels": "Severity determines dashboard priority." */
export type InsightSeverity = "information" | "positive" | "warning" | "critical";

/** 19_INSIGHTS_LIBRARY.md, "Confidence Levels": a bucketed reading of the raw 0-1 confidence score. */
export type ConfidenceLevel = "very_high" | "high" | "moderate" | "low";

/**
 * 19_INSIGHTS_LIBRARY.md, "Insight Prioritization": "1. Critical Alerts,
 * 2. Injury Risk, 3. Recovery, 4. Race Readiness, 5. Performance, 6.
 * Fitness, 7. Efficiency, 8. Equipment. Lower-priority insights should
 * never hide higher-priority ones." 1 is the highest priority.
 */
export type InsightPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  evidence: string[];
  confidence: number; // 0-1, raw score
  confidenceLevel: ConfidenceLevel;
  /** Names of the Metrics Engine outputs this insight was computed from ("métricas utilizadas"). */
  relatedMetrics: string[];
  /** ISO date this insight was generated for/from. */
  date: string;
  severity: InsightSeverity;
  /**
   * Always empty: generating recommendations is the Coach Engine's
   * responsibility (DEC-0006), never this engine's -- "The Intelligence
   * Engine NEVER makes coaching decisions" (08_INTELLIGENCE_ENGINE.md).
   * The field exists so a downstream consumer (Coach Engine) has a
   * defined slot to attach recommendation ids to, without this engine
   * ever populating it itself.
   */
  relatedRecommendations: string[];
}
