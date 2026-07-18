import type { Recommendation, TrendDirection } from "./types";

export interface RecoverySignals {
  recoveryScore: number | null; // 0-100, from Metrics Engine
  acwr: number | null; // Acute:Chronic Workload Ratio, from Prediction Engine's injury risk result
  hrDriftTrend: TrendDirection | null; // from an Intelligence Engine Insight
  hasWearableRecoveryData: boolean; // whether sleep/HRV are actually being tracked for this athlete
}

const LOW_RECOVERY_THRESHOLD = 30;
const MODERATE_RECOVERY_THRESHOLD = 50;
const HIGH_ACWR_THRESHOLD = 1.5; // same "danger zone" threshold used by Prediction Engine's injury risk model

/**
 * "Recovery Coaching" (COACH_ENGINE.md p.51): "Monitor: Sleep, Training
 * Load, Fatigue, Recovery Score, Trend. Coach may recommend: Recovery
 * Day, Lower Intensity, Mobility, Nutrition, Sleep Priority." Unlike
 * recommendTraining (one decision per day), recovery guidance can be
 * multiple independent, applicable actions at once -- this returns all
 * that apply, deduplicated, rather than picking a single winner.
 */
export function recommendRecovery(signals: RecoverySignals): Recommendation[] {
  const { recoveryScore, acwr, hrDriftTrend, hasWearableRecoveryData } = signals;
  const recommendations: Recommendation[] = [];

  const loadEvidence: string[] = [];
  if (recoveryScore != null && recoveryScore < LOW_RECOVERY_THRESHOLD) loadEvidence.push(`Recovery Score ${recoveryScore.toFixed(0)}%`);
  if (acwr != null && acwr > HIGH_ACWR_THRESHOLD) loadEvidence.push(`ACWR ${acwr.toFixed(2)}`);

  if (recoveryScore != null && recoveryScore < LOW_RECOVERY_THRESHOLD) {
    recommendations.push({
      recommendation: "Recovery Day",
      reason: "Recovery is critically low.",
      evidence: loadEvidence,
      confidence: 0.8,
      expectedOutcome: "Restores recovery capacity before the next quality session.",
      alternative: "If recovery is still low after a full rest day, extend to a Recovery Week.",
    });
  } else if (
    (recoveryScore != null && recoveryScore < MODERATE_RECOVERY_THRESHOLD) ||
    (acwr != null && acwr > HIGH_ACWR_THRESHOLD)
  ) {
    recommendations.push({
      recommendation: "Lower Intensity",
      reason: "Acute load is running ahead of what recovery currently supports.",
      evidence: loadEvidence,
      confidence: 0.7,
      expectedOutcome: "Brings acute load back in line with chronic capacity without a full day off.",
      alternative: "If the next Recovery Score is still low, take a full Recovery Day instead.",
    });
  }

  if (hrDriftTrend === "increasing") {
    recommendations.push({
      recommendation: "Mobility",
      reason: "Cardiac decoupling (HR Drift) has been trending up, a common early sign of accumulating fatigue.",
      evidence: ["HR Drift increasing"],
      confidence: 0.55,
      expectedOutcome: "Supports recovery through active, low-load movement rather than complete rest.",
      alternative: "If HR Drift keeps rising over the next few sessions, prioritize a Recovery Day instead.",
    });
  }

  if (!hasWearableRecoveryData) {
    recommendations.push({
      recommendation: "Sleep Priority",
      reason: "No sleep or HRV data is being tracked yet.",
      evidence: [],
      confidence: 0.5,
      expectedOutcome: "Sleep is one of the strongest levers for recovery regardless of current training load.",
      alternative: "Connecting a sleep/HRV-tracking device would let this recommendation become athlete-specific.",
    });
  }

  return recommendations;
}
