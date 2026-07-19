import type { TrainingDecisionStrategy } from "../strategy";

// The exact "recovery high, fatigue low" pattern from
// 10_COACH_ENGINE.md p.54. Confidence 0.95 is the spec's own literal
// number for this exact scenario, not a computed formula.
const HIGH_RECOVERY_THRESHOLD = 85;
const PATTERN_CONFIDENCE = 0.95;

/** Tier 5: the spec's own "recovery high, fatigue low" worked example -- the only tier that increases load. */
export const highRecoveryIncreaseStrategy: TrainingDecisionStrategy = {
  name: "high_recovery_increase",
  appliesTo: (signals) => signals.recoveryScore != null && signals.recoveryScore >= HIGH_RECOVERY_THRESHOLD && signals.hrDriftTrend === "decreasing" && signals.lt1Trend === "increasing",
  decide: () => ({
    action: "increase_load",
    reasoning: "Recovery is high, HR Drift is improving and LT1 is trending upward -- fitness can absorb more load right now.",
    supportingMetrics: ["recovery_score", "hr_drift", "lt1"],
    confidence: PATTERN_CONFIDENCE,
  }),
};
