// Prediction Engine envelope. Per 09_PREDICTION_ENGINE.md / DOMAIN_MODEL.md's
// Prediction entity: "Represents future estimations... Generated only by
// the Prediction Engine." Every predictor function in this engine returns
// exactly this shape -- the explicit field list requested for this build:
// id, predictionType, value, confidence, lowerBound, upperBound,
// supportingMetrics, supportingInsights, assumptions, generatedAt,
// expiresAt. Distinct from the Metrics Engine's `MetricResult<T>` (a
// point-in-time calculation envelope) and the Intelligence Engine's
// `Insight` (an interpretation of past/current data): a Prediction is
// always about the *future*, always carries a confidence interval, and
// always documents its own expiry (a fitness projection from 3 weeks ago
// is stale in a way a calculated CTL value from 3 weeks ago is not).

/** The 7 requested predictor categories. */
export type PredictionCategory = "race" | "fitness" | "threshold" | "recovery" | "injury_risk" | "goal" | "readiness";

/**
 * One value per predictor sub-capability explicitly requested. Kept as a
 * flat string union (not nested per category) so a consumer can switch on
 * `predictionType` without also needing `category` -- `category` is still
 * carried separately for grouping/UI purposes.
 */
export type PredictionType =
  // Race Predictor
  | "race_time_5k"
  | "race_time_10k"
  | "race_time_15k"
  | "race_time_21k"
  | "race_time_30k"
  | "race_time_marathon"
  // Fitness Predictor
  | "ctl_evolution"
  | "fitness_score_evolution"
  | "running_effectiveness_evolution"
  // Threshold Predictor
  | "lt1_evolution"
  | "lt2_evolution"
  | "critical_power_evolution"
  | "ftp_evolution"
  // Recovery Predictor
  | "recovery_time"
  | "current_load_impact"
  // Injury Risk Predictor
  | "injury_risk_acute_load"
  | "injury_risk_monotony"
  | "injury_risk_accumulated_fatigue"
  // Goal Predictor
  | "goal_achievement"
  // Readiness Predictor
  | "readiness_race"
  | "readiness_hard_training";

export interface Prediction<T> {
  id: string;
  predictionType: PredictionType;
  category: PredictionCategory;
  value: T | null;
  /** 0-1. How much to trust `value`. */
  confidence: number;
  /**
   * Confidence interval bounds, in the same unit as `value` when `value`
   * is a plain number (e.g. seconds, watts, days); null when `value` is a
   * structured object or when no interval could be computed (see each
   * algorithm's own doc comment for how its interval is derived --
   * "Nenhuma previsão pode ser uma caixa preta").
   */
  lowerBound: number | null;
  upperBound: number | null;
  /** Names of the Metrics Engine / raw-data inputs this prediction was computed from. */
  supportingMetrics: string[];
  /** Ids of Intelligence Engine Insights that informed this prediction, if any were supplied by the caller. Always []  when none were passed in -- this engine never looks Insights up itself. */
  supportingInsights: string[];
  /** Explicit, human-readable assumptions the prediction depends on (e.g. "assumes complete rest", "assumes the current linear trend continues"). */
  assumptions: string[];
  /** ISO timestamp this prediction was generated. */
  generatedAt: string;
  /** ISO timestamp after which this prediction should be considered stale and recalculated. */
  expiresAt: string;
}
