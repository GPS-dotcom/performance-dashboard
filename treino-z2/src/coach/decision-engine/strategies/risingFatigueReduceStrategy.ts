import type { TrainingDecisionStrategy } from "../strategy";

// The exact "fatigue increased" pattern from 10_COACH_ENGINE.md p.50
// (ATL rising + HR Drift rising + Recovery Score falling), reused for the
// Training Decision Engine's "reduce load" tier -- the same worked
// example, in this vocabulary. Confidence 0.92 is the spec's own literal
// number for this exact scenario, not a computed formula.
const PATTERN_CONFIDENCE = 0.92;

/** Tier 3: the spec's own "fatigue increased" worked example. */
export const risingFatigueReduceStrategy: TrainingDecisionStrategy = {
  name: "rising_fatigue_reduce",
  appliesTo: (signals) => signals.atlTrend === "increasing" && signals.hrDriftTrend === "increasing" && signals.recoveryScoreTrend === "decreasing",
  decide: () => ({
    action: "reduce_load",
    reasoning: "Fatigue increased: ATL is rising, HR Drift is rising, and Recovery Score is falling -- reducing load lets recovery catch back up.",
    supportingMetrics: ["atl", "hr_drift", "recovery_score"],
    confidence: PATTERN_CONFIDENCE,
  }),
};
