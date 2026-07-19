import { RecommendationFactory } from "./recommendationFactory";
import { generalConfidence } from "../validators/confidenceFormula";
import type { Recommendation } from "../types/recommendation";
import type { VolumeSignals } from "../types/signals";

// Same ACWR "sweet spot"/"danger zone" bands the Prediction Engine's
// injury risk model and this engine's Recovery Recommendation already
// use (Gabbett, 2016) -- weekly volume guidance is the same underlying
// signal, read for a different purpose (how much to run, not how risky
// today is).
const HIGH_ACWR_THRESHOLD = 1.5;
const LOW_ACWR_THRESHOLD = 0.8;
const LOW_CONSISTENCY_THRESHOLD = 0.6;

/**
 * "volume" (Volume Recommendation): how much weekly training volume to
 * carry, distinct from today's intensity -- reads ACWR (acute load
 * relative to chronic capacity) and recent consistency to decide whether
 * volume should come down, rebuild gradually, or has room to grow.
 */
export function generateVolumeRecommendation(signals: VolumeSignals, createdAt: string): Recommendation {
  const { acwr, consistencyRatio, weeklyDistanceTrend } = signals;

  if (acwr != null && acwr > HIGH_ACWR_THRESHOLD) {
    return RecommendationFactory.create({
      type: "volume",
      kind: "reduce_volume",
      priority: 1,
      title: "Reduce Weekly Volume",
      description: "Scale back this week's total training volume.",
      reasoning: `Acute load is far ahead of chronic capacity (ACWR ${acwr.toFixed(2)}, above the ${HIGH_ACWR_THRESHOLD} danger-zone threshold) -- reducing volume brings the ratio back toward a sustainable range.`,
      supportingMetrics: ["acwr"],
      confidence: 0.75,
      createdAt,
    });
  }

  if (consistencyRatio != null && consistencyRatio < LOW_CONSISTENCY_THRESHOLD) {
    return RecommendationFactory.create({
      type: "volume",
      kind: "rebuild_volume_gradually",
      priority: 2,
      title: "Rebuild Volume Gradually",
      description: "Ramp weekly volume back up in small increments rather than returning to the prior peak immediately.",
      reasoning: `Consistency has been low recently (${(consistencyRatio * 100).toFixed(0)}% of planned sessions completed) -- jumping straight back to the prior volume would spike ACWR and raise injury risk.`,
      supportingMetrics: ["consistency_ratio"],
      confidence: generalConfidence(1),
      createdAt,
    });
  }

  if (acwr != null && acwr < LOW_ACWR_THRESHOLD) {
    return RecommendationFactory.create({
      type: "volume",
      kind: "increase_volume",
      priority: 3,
      title: "Increase Weekly Volume",
      description: "There's room to add volume this week.",
      reasoning: `Acute load is well below chronic capacity (ACWR ${acwr.toFixed(2)}, below the ${LOW_ACWR_THRESHOLD} threshold) -- fitness can absorb more volume without a sharp load spike.`,
      supportingMetrics: ["acwr"],
      confidence: 0.65,
      createdAt,
    });
  }

  if (weeklyDistanceTrend === "increasing" && acwr != null && acwr <= HIGH_ACWR_THRESHOLD) {
    return RecommendationFactory.create({
      type: "volume",
      kind: "maintain_progression",
      priority: 3,
      title: "Maintain Volume Progression",
      description: "Continue the current gradual increase in weekly volume.",
      reasoning: "Weekly distance is trending upward while ACWR remains within a safe range -- the current progression is sustainable.",
      supportingMetrics: ["weekly_distance", "acwr"],
      confidence: generalConfidence(2),
      createdAt,
    });
  }

  return RecommendationFactory.create({
    type: "volume",
    kind: "maintain_volume",
    priority: 4,
    title: "Maintain Weekly Volume",
    description: "Keep this week's volume similar to recent weeks.",
    reasoning: "No strong signal in either direction -- holding steady is the safe default.",
    supportingMetrics: [],
    confidence: generalConfidence(0),
    createdAt,
  });
}
