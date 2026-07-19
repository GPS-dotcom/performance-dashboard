import { generalConfidence } from "../../validators/confidenceFormula";
import type { TrainingDecisionStrategy } from "../strategy";

const LOW_RECOVERY_THRESHOLD = 30;
const CRITICAL_TSB_THRESHOLD = -30;

/** Tier 2: critically low recovery or critically negative TSB -- active recovery, not full rest, since some easy movement is still appropriate. */
export const criticalFatigueRecoveryStrategy: TrainingDecisionStrategy = {
  name: "critical_fatigue_recovery",
  appliesTo: (signals) => (signals.recoveryScore != null && signals.recoveryScore < LOW_RECOVERY_THRESHOLD) || (signals.tsb != null && signals.tsb < CRITICAL_TSB_THRESHOLD),
  decide: (signals) => {
    const supportingMetrics: string[] = [];
    if (signals.recoveryScore != null && signals.recoveryScore < LOW_RECOVERY_THRESHOLD) supportingMetrics.push("recovery_score");
    if (signals.tsb != null && signals.tsb < CRITICAL_TSB_THRESHOLD) supportingMetrics.push("tsb");
    return {
      action: "active_recovery",
      reasoning: "Recovery is critically low -- light, low-load activity restores recovery capacity faster than complete rest without adding fatigue.",
      supportingMetrics,
      confidence: generalConfidence(supportingMetrics.length),
    };
  },
};
