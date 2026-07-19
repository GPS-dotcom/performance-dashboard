import { RecommendationFactory } from "./recommendationFactory";
import { generalConfidence } from "../validators/confidenceFormula";
import type { Recommendation } from "../types/recommendation";
import type { TrainingSignals } from "../types/signals";

const EXTREME_FATIGUE_TSB_THRESHOLD = -30;
const EXTREME_FATIGUE_RECOVERY_THRESHOLD = 25;

/**
 * "descanso" (Rest Recommendation): a dedicated full-rest-day suggestion,
 * distinct from the Intensity Recommendation's "Rest"/"Recovery Week"
 * tiers (which pick one workout-type suggestion for today no matter
 * what) -- this one only fires (returns non-null) when the signals
 * genuinely warrant a complete day off, so callers can treat its absence
 * as "no explicit rest day needed."
 */
export function generateRestRecommendation(signals: TrainingSignals, createdAt: string): Recommendation | null {
  const { injuryRiskLevel, tsb, recoveryScore } = signals;

  if (injuryRiskLevel === "high") {
    return RecommendationFactory.create({
      type: "rest",
      kind: "full_rest_injury_risk",
      priority: 1,
      title: "Full Rest Day",
      description: "Take a complete rest day -- no training, structured or otherwise.",
      reasoning: "Injury risk is elevated -- a full rest day removes load entirely rather than just lowering it.",
      supportingMetrics: ["injury_risk_level"],
      confidence: 0.85,
      createdAt,
    });
  }

  const extremeFatigue = (tsb != null && tsb < EXTREME_FATIGUE_TSB_THRESHOLD) || (recoveryScore != null && recoveryScore < EXTREME_FATIGUE_RECOVERY_THRESHOLD);
  if (extremeFatigue) {
    const supportingMetrics: string[] = [];
    const evidence: string[] = [];
    if (tsb != null && tsb < EXTREME_FATIGUE_TSB_THRESHOLD) {
      supportingMetrics.push("tsb");
      evidence.push(`TSB ${tsb.toFixed(1)}`);
    }
    if (recoveryScore != null && recoveryScore < EXTREME_FATIGUE_RECOVERY_THRESHOLD) {
      supportingMetrics.push("recovery_score");
      evidence.push(`Recovery Score ${recoveryScore.toFixed(0)}%`);
    }
    return RecommendationFactory.create({
      type: "rest",
      kind: "full_rest_extreme_fatigue",
      priority: 1,
      title: "Full Rest Day",
      description: "Take a complete rest day -- no training, structured or otherwise.",
      reasoning: `Fatigue is extremely high relative to fitness (${evidence.join(", ")}) -- complete rest is warranted rather than a lighter session.`,
      supportingMetrics,
      confidence: generalConfidence(supportingMetrics.length),
      createdAt,
    });
  }

  return null;
}
