import { RecommendationFactory } from "./recommendationFactory";
import { generalConfidence } from "../validators/confidenceFormula";
import type { Recommendation } from "../types/recommendation";
import type { TrainingSignals } from "../types/signals";

// Confidence for the two rule branches below is taken verbatim from
// 10_COACH_ENGINE.md's own worked examples (p.50 and p.54) -- not a
// formula, the spec's literal numbers for that exact scenario.
const EASY_RUN_EXAMPLE_CONFIDENCE = 0.92; // p.50: "Fatigue increased" example
const THRESHOLD_EXAMPLE_CONFIDENCE = 0.95; // p.54: "Recovery is high and fatigue is low" example

/**
 * "intensidade" (Intensity Recommendation): the specific workout-type
 * suggestion for today (Easy Run, Recovery Run, Threshold, Long Run, ...)
 * -- a deterministic rule cascade (first matching tier wins), distinct
 * from the Training Decision Engine's coarser 5-way load call even
 * though both read the same `TrainingSignals`.
 */
export function generateIntensityRecommendation(signals: TrainingSignals, createdAt: string): Recommendation {
  const { recoveryScore, recoveryScoreTrend, atlTrend, hrDriftTrend, lt1Trend, tsb, injuryRiskLevel } = signals;

  if (injuryRiskLevel === "high") {
    return RecommendationFactory.create({
      type: "intensity",
      kind: "rest",
      priority: 1,
      title: "Rest",
      description: "Skip structured training today.",
      reasoning: "Injury risk is elevated based on current training load.",
      supportingMetrics: ["injury_risk_level"],
      confidence: 0.85,
      createdAt,
    });
  }

  if ((recoveryScore != null && recoveryScore < 30) || (tsb != null && tsb < -30)) {
    const supportingMetrics: string[] = [];
    if (recoveryScore != null && recoveryScore < 30) supportingMetrics.push("recovery_score");
    if (tsb != null && tsb < -30) supportingMetrics.push("tsb");
    return RecommendationFactory.create({
      type: "intensity",
      kind: "recovery_week",
      priority: 1,
      title: "Recovery Week",
      description: "Reduce training volume and intensity for the next several days.",
      reasoning: "Recovery is critically low.",
      supportingMetrics,
      confidence: generalConfidence(supportingMetrics.length),
      createdAt,
    });
  }

  if (atlTrend === "increasing" && hrDriftTrend === "increasing" && recoveryScoreTrend === "decreasing") {
    return RecommendationFactory.create({
      type: "intensity",
      kind: "easy_run",
      priority: 2,
      title: "Easy Run",
      description: "An easy-effort aerobic session.",
      reasoning: "Fatigue increased: ATL increased, HR Drift increased, and Recovery Score decreased.",
      supportingMetrics: ["atl", "hr_drift", "recovery_score"],
      confidence: EASY_RUN_EXAMPLE_CONFIDENCE,
      createdAt,
    });
  }

  if (recoveryScore != null && recoveryScore < 50) {
    return RecommendationFactory.create({
      type: "intensity",
      kind: "recovery_run",
      priority: 2,
      title: "Recovery Run",
      description: "A short, easy-paced run.",
      reasoning: "Recovery is below a comfortable range for quality training.",
      supportingMetrics: ["recovery_score"],
      confidence: generalConfidence(1),
      createdAt,
    });
  }

  if (recoveryScore != null && recoveryScore >= 85 && hrDriftTrend === "decreasing" && lt1Trend === "increasing") {
    return RecommendationFactory.create({
      type: "intensity",
      kind: "threshold",
      priority: 3,
      title: "Threshold",
      description: "A threshold-intensity session.",
      reasoning: "Recovery is high and fatigue is low.",
      supportingMetrics: ["recovery_score", "hr_drift", "lt1"],
      confidence: THRESHOLD_EXAMPLE_CONFIDENCE,
      createdAt,
    });
  }

  if (recoveryScore != null && recoveryScore >= 70) {
    return RecommendationFactory.create({
      type: "intensity",
      kind: "long_run",
      priority: 3,
      title: "Long Run",
      description: "A longer aerobic-effort session.",
      reasoning: "Recovery is good enough to sustain a longer aerobic effort.",
      supportingMetrics: ["recovery_score"],
      confidence: generalConfidence(1),
      createdAt,
    });
  }

  return RecommendationFactory.create({
    type: "intensity",
    kind: "easy_run_default",
    priority: 4,
    title: "Easy Run",
    description: "An easy-effort aerobic session.",
    reasoning: "No strong signal in either direction -- a safe default.",
    supportingMetrics: [],
    confidence: generalConfidence(0),
    createdAt,
  });
}
