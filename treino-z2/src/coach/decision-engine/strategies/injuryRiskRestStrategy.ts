import type { TrainingDecisionStrategy } from "../strategy";

/** Tier 1 (highest priority): elevated injury risk always wins, regardless of any other signal. */
export const injuryRiskRestStrategy: TrainingDecisionStrategy = {
  name: "injury_risk_rest",
  appliesTo: (signals) => signals.injuryRiskLevel === "high",
  decide: () => ({
    action: "full_rest",
    reasoning: "Injury risk is elevated based on current training load -- resting reduces load until risk returns to a safe range.",
    supportingMetrics: ["injury_risk_level"],
    confidence: 0.85,
  }),
};
