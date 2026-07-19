import { generalConfidence } from "../../validators/confidenceFormula";
import type { TrainingDecisionStrategy } from "../strategy";

const LOW_RECOVERY_THRESHOLD = 50;

/** Tier 4: recovery below a comfortable range for quality training, but not critical. */
export const lowRecoveryReduceStrategy: TrainingDecisionStrategy = {
  name: "low_recovery_reduce",
  appliesTo: (signals) => signals.recoveryScore != null && signals.recoveryScore < LOW_RECOVERY_THRESHOLD,
  decide: () => ({
    action: "reduce_load",
    reasoning: "Recovery is below a comfortable range for quality training -- reducing load maintains stimulus without adding fatigue.",
    supportingMetrics: ["recovery_score"],
    confidence: generalConfidence(1),
  }),
};
