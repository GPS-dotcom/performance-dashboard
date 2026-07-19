import { RecommendationFactory } from "./recommendationFactory";
import type { Recommendation } from "../types/recommendation";
import type { RecoverySignals } from "../types/signals";

const LOW_RECOVERY_THRESHOLD = 30;
const MODERATE_RECOVERY_THRESHOLD = 50;
const HIGH_ACWR_THRESHOLD = 1.5; // same "danger zone" threshold used by the Prediction Engine's injury risk model

/**
 * "recuperação" (Recovery Recommendation). Per 10_COACH_ENGINE.md p.51's
 * "Recovery Coaching": "Coach may recommend: Recovery Day, Lower
 * Intensity, Mobility, Sleep Priority." Unlike the Training Decision
 * Engine (one decision per day), recovery guidance can be several
 * independent, simultaneously-applicable actions -- returns every rule
 * that fires, not just one winner.
 */
export function generateRecoveryRecommendations(signals: RecoverySignals, createdAt: string): Recommendation[] {
  const { recoveryScore, acwr, hrDriftTrend, hasWearableRecoveryData } = signals;
  const recommendations: Recommendation[] = [];

  const loadEvidence: string[] = [];
  const loadMetrics: string[] = [];
  if (recoveryScore != null && recoveryScore < LOW_RECOVERY_THRESHOLD) {
    loadEvidence.push(`Recovery Score ${recoveryScore.toFixed(0)}%`);
    loadMetrics.push("recovery_score");
  }
  if (acwr != null && acwr > HIGH_ACWR_THRESHOLD) {
    loadEvidence.push(`ACWR ${acwr.toFixed(2)}`);
    loadMetrics.push("acwr");
  }

  if (recoveryScore != null && recoveryScore < LOW_RECOVERY_THRESHOLD) {
    recommendations.push(
      RecommendationFactory.create({
        type: "recovery",
        kind: "recovery_day",
        priority: 1,
        title: "Recovery Day",
        description: "Take a full recovery day -- no structured training today.",
        reasoning: `Recovery is critically low (${loadEvidence.join(", ")}), so restoring recovery capacity takes priority over any training stimulus.`,
        supportingMetrics: loadMetrics,
        confidence: 0.8,
        createdAt,
      }),
    );
  } else if ((recoveryScore != null && recoveryScore < MODERATE_RECOVERY_THRESHOLD) || (acwr != null && acwr > HIGH_ACWR_THRESHOLD)) {
    recommendations.push(
      RecommendationFactory.create({
        type: "recovery",
        kind: "lower_intensity",
        priority: 2,
        title: "Lower Intensity",
        description: "Keep today's session, but at a lower intensity than originally planned.",
        reasoning: `Acute load is running ahead of what recovery currently supports (${loadEvidence.join(", ")}), so lowering intensity brings load back in line without a full day off.`,
        supportingMetrics: loadMetrics,
        confidence: 0.7,
        createdAt,
      }),
    );
  }

  if (hrDriftTrend === "increasing") {
    recommendations.push(
      RecommendationFactory.create({
        type: "recovery",
        kind: "mobility",
        priority: 3,
        title: "Mobility",
        description: "Add a mobility or light active-recovery session.",
        reasoning: "Cardiac decoupling (HR Drift) has been trending up, a common early sign of accumulating fatigue -- active, low-load movement supports recovery without complete rest.",
        supportingMetrics: ["hr_drift"],
        confidence: 0.55,
        createdAt,
      }),
    );
  }

  if (!hasWearableRecoveryData) {
    recommendations.push(
      RecommendationFactory.create({
        type: "recovery",
        kind: "sleep_priority",
        priority: 4,
        title: "Sleep Priority",
        description: "Prioritize consistent, sufficient sleep.",
        reasoning: "No sleep or HRV data is being tracked yet, so this recommendation is general rather than athlete-specific -- sleep remains one of the strongest levers for recovery regardless of current training load.",
        supportingMetrics: [],
        confidence: 0.5,
        createdAt,
      }),
    );
  }

  return recommendations;
}
