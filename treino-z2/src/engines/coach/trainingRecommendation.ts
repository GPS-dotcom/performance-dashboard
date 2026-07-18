import type { Recommendation, TrainingSignals } from "./types";

// Confidence for the two rule branches below is taken verbatim from
// COACH_ENGINE.md's own worked examples (p.50 and p.54) -- not a formula,
// the spec's literal numbers for that exact scenario.
const EASY_RUN_EXAMPLE_CONFIDENCE = 0.92; // p.50: "Fatigue increased" example
const THRESHOLD_EXAMPLE_CONFIDENCE = 0.95; // p.54: "Recovery is high and fatigue is low" example

// Every other branch uses this general, documented formula instead of a
// spec-given number: a moderate base, nudged by how many signals support
// the call, capped below the two exact-match branches above so this
// engine never claims more certainty than the spec's own calibration
// examples for a genuinely ambiguous case.
const GENERAL_BASE_CONFIDENCE = 0.6;
const GENERAL_CONFIDENCE_PER_SIGNAL = 0.08;
const GENERAL_CONFIDENCE_CAP = 0.85;

function generalConfidence(supportingSignals: number): number {
  return Math.min(GENERAL_CONFIDENCE_CAP, GENERAL_BASE_CONFIDENCE + supportingSignals * GENERAL_CONFIDENCE_PER_SIGNAL);
}

/**
 * Recommends today's training, via a deterministic rule cascade (first
 * matching tier wins) over signals already produced by the Metrics,
 * Intelligence and Prediction Engines. Never calculates a metric or a
 * prediction itself -- every input here is a value this engine was handed.
 *
 * Tiers, in priority order:
 *   1. High injury risk -> Rest.
 *   2. Very low recovery -> Recovery Week.
 *   3. The exact "fatigue increased" pattern from COACH_ENGINE.md p.50
 *      (ATL rising + HR Drift rising + Recovery Score falling) -> Easy Run,
 *      confidence 92% (the spec's own number for this exact scenario).
 *   4. Low recovery -> Recovery Run.
 *   5. The exact "recovery high, fatigue low" pattern from p.54 (Recovery
 *      Score high + HR Drift improving + LT1 trending up) -> Threshold,
 *      confidence 95% (the spec's own number for this exact scenario).
 *   6. High recovery (general case) -> Long Run.
 *   7. Default -> Easy Run (the safe, generic fallback).
 */
export function recommendTraining(signals: TrainingSignals): Recommendation {
  const { recoveryScore, recoveryScoreTrend, atlTrend, hrDriftTrend, lt1Trend, tsb, injuryRiskLevel } = signals;

  if (injuryRiskLevel === "high") {
    return {
      recommendation: "Rest",
      reason: "Injury risk is elevated.",
      evidence: ["Injury risk: high"],
      confidence: 0.85,
      expectedOutcome: "Reduces load to bring injury risk back to a safe range.",
      alternative: "If risk remains high after 2-3 rest days, consider a full Recovery Week.",
    };
  }

  if ((recoveryScore != null && recoveryScore < 30) || (tsb != null && tsb < -30)) {
    const evidence: string[] = [];
    if (recoveryScore != null) evidence.push(`Recovery Score ${recoveryScore.toFixed(0)}%`);
    if (tsb != null) evidence.push(`TSB ${tsb.toFixed(1)}`);
    return {
      recommendation: "Recovery Week",
      reason: "Recovery is critically low.",
      evidence,
      confidence: generalConfidence(evidence.length),
      expectedOutcome: "Restores recovery capacity before resuming quality training.",
      alternative: "If recovery improves within 2-3 days, resume with Easy Run before quality sessions.",
    };
  }

  if (atlTrend === "increasing" && hrDriftTrend === "increasing" && recoveryScoreTrend === "decreasing") {
    return {
      recommendation: "Easy Run",
      reason: "Fatigue increased.",
      evidence: ["ATL increased", "HR Drift increased", "Recovery Score decreased"],
      confidence: EASY_RUN_EXAMPLE_CONFIDENCE,
      expectedOutcome: "Improved recovery for tomorrow's quality session.",
      alternative: "If fatigue persists tomorrow, consider a full Rest day.",
    };
  }

  if (recoveryScore != null && recoveryScore < 50) {
    return {
      recommendation: "Recovery Run",
      reason: "Recovery is below a comfortable range for quality training.",
      evidence: [`Recovery Score ${recoveryScore.toFixed(0)}%`],
      confidence: generalConfidence(1),
      expectedOutcome: "Maintains aerobic stimulus without adding fatigue.",
      alternative: "If Recovery Score improves tomorrow, an Easy Run is appropriate.",
    };
  }

  if (recoveryScore != null && recoveryScore >= 85 && hrDriftTrend === "decreasing" && lt1Trend === "increasing") {
    return {
      recommendation: "Threshold",
      reason: "Recovery is high and fatigue is low.",
      evidence: [`Recovery Score ${recoveryScore.toFixed(0)}%`, "HR Drift improving", "LT1 trending upward"],
      confidence: THRESHOLD_EXAMPLE_CONFIDENCE,
      expectedOutcome: "Builds fitness while recovery capacity is high.",
      alternative: "If fatigue increases tomorrow, replace with Easy Run.",
    };
  }

  if (recoveryScore != null && recoveryScore >= 70) {
    return {
      recommendation: "Long Run",
      reason: "Recovery is good enough to sustain a longer aerobic effort.",
      evidence: [`Recovery Score ${recoveryScore.toFixed(0)}%`],
      confidence: generalConfidence(1),
      expectedOutcome: "Builds aerobic endurance while recovery capacity allows it.",
      alternative: "If fatigue rises during the session, shorten it and finish easy.",
    };
  }

  return {
    recommendation: "Easy Run",
    reason: "No strong signal in either direction -- a safe default.",
    evidence: [],
    confidence: generalConfidence(0),
    expectedOutcome: "Maintains consistency without risking added fatigue.",
    alternative: "Reassess tomorrow once more signals are available.",
  };
}
