import { generalConfidence } from "../../validators/confidenceFormula";
import type { TrainingDecisionStrategy } from "../strategy";

const GOOD_RECOVERY_THRESHOLD = 70;

/** Tier 6: recovery is good enough to sustain current load comfortably, but doesn't meet the stricter bar (tier 5) to actively increase it. */
export const goodRecoveryMaintainStrategy: TrainingDecisionStrategy = {
  name: "good_recovery_maintain",
  appliesTo: (signals) => signals.recoveryScore != null && signals.recoveryScore >= GOOD_RECOVERY_THRESHOLD,
  decide: () => ({
    action: "maintain_load",
    reasoning: "Recovery is good enough to sustain the current training load without adding or removing volume.",
    supportingMetrics: ["recovery_score"],
    confidence: generalConfidence(1),
  }),
};
