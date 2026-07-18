// Coach Engine types, per 10_COACH_ENGINE.md.
//
// "The Coach Engine is the decision-making layer... It transforms
// metrics, insights and predictions into personalized coaching
// recommendations. It is not a chatbot... It never calculates
// physiological metrics. It never predicts performance. It consumes
// outputs from other engines."
//
// Every function in this engine is a deterministic rule cascade over
// already-computed values -- no LLM call, no metric calculation, no
// prediction. This module only ever imports *types* (never calculation
// functions) from ../metrics and ../prediction, so it is structurally
// unable to compute a metric or a prediction itself.

export type TrendDirection = "increasing" | "decreasing" | "stable";
export type RiskLevel = "low" | "moderate" | "high";

/**
 * "Recommendation Rules" (COACH_ENGINE.md p.50): "Every recommendation
 * must contain: Recommendation, Reason, Evidence, Confidence, Expected
 * Outcome." "Explainability" (p.54) adds "Alternative": "If fatigue
 * increases tomorrow, replace with Easy Run."
 */
export interface Recommendation {
  recommendation: string;
  reason: string;
  evidence: string[];
  confidence: number; // 0-1
  expectedOutcome: string;
  alternative: string | null;
}

/** "Escalation Rules" (p.55-56): "Alerts have higher priority than recommendations." */
export type AlertKind =
  | "high_injury_risk"
  | "extreme_fatigue"
  | "rapid_performance_drop"
  | "overreaching"
  | "abnormal_training_load"
  | "unusual_recovery_pattern";

export interface CoachAlert {
  kind: AlertKind;
  severity: "warning" | "critical";
  message: string;
  evidence: string[];
}

/** Signals the Coach Engine reads (never computes) to make a training decision. */
export interface TrainingSignals {
  recoveryScore: number | null; // 0-100, from Metrics Engine's calculateRecoveryScore
  recoveryScoreTrend: TrendDirection | null; // from an Intelligence Engine Insight
  atlTrend: TrendDirection | null; // rising ATL = more fatigue
  hrDriftTrend: TrendDirection | null; // rising = worse cardiac decoupling
  lt1Trend: TrendDirection | null; // rising pace/power at LT1 = improving aerobic fitness
  tsb: number | null;
  injuryRiskLevel: RiskLevel | null; // from Prediction Engine's predictInjuryRisk
}
