import type { AlertKind, CoachAlert, RiskLevel } from "./types";

export interface AlertSignals {
  injuryRiskLevel: RiskLevel | null; // from Prediction Engine's predictInjuryRisk
  tsb: number | null;
  recoveryScore: number | null; // 0-100, from Metrics Engine
  acwr: number | null; // from Prediction Engine's injury risk result
  performanceTrendDeclining: boolean; // a high-confidence declining trend Insight from the Intelligence Engine
}

const EXTREME_FATIGUE_TSB_THRESHOLD = -30;
const EXTREME_FATIGUE_RECOVERY_THRESHOLD = 25;
// Beyond the Prediction Engine's own "high injury risk" threshold (1.5) -- a
// sustained ACWR this extreme is a distinct, more severe overreaching signal.
const OVERREACHING_ACWR_THRESHOLD = 2.0;
const ABNORMAL_LOW_ACWR_THRESHOLD = 0.5;
const UNUSUAL_PATTERN_ACWR_THRESHOLD = 0.8;
const UNUSUAL_PATTERN_RECOVERY_THRESHOLD = 50;

/**
 * "Escalation Rules" (COACH_ENGINE.md p.55-56): "The Coach should generate
 * alerts when detecting: High Injury Risk, Extreme Fatigue, Rapid
 * Performance Drop, Overreaching, Overtraining, Unusual Recovery Pattern,
 * Abnormal Training Load. Alerts have higher priority than
 * recommendations." Returns every alert that applies, not just one --
 * callers (e.g. generateDailyBrief) are responsible for surfacing these
 * ahead of any recommendation.
 */
export function detectAlerts(signals: AlertSignals): CoachAlert[] {
  const { injuryRiskLevel, tsb, recoveryScore, acwr, performanceTrendDeclining } = signals;
  const alerts: CoachAlert[] = [];

  const push = (kind: AlertKind, severity: CoachAlert["severity"], message: string, evidence: string[]) => {
    alerts.push({ kind, severity, message, evidence });
  };

  if (injuryRiskLevel === "high") {
    push("high_injury_risk", "critical", "Injury risk is elevated based on current training load.", ["Injury risk: high"]);
  }

  if (tsb != null && tsb < EXTREME_FATIGUE_TSB_THRESHOLD) {
    push("extreme_fatigue", "critical", "Fatigue is extremely high relative to fitness.", [`TSB ${tsb.toFixed(1)}`]);
  } else if (recoveryScore != null && recoveryScore < EXTREME_FATIGUE_RECOVERY_THRESHOLD) {
    push("extreme_fatigue", "warning", "Recovery is critically low.", [`Recovery Score ${recoveryScore.toFixed(0)}%`]);
  }

  if (performanceTrendDeclining) {
    push("rapid_performance_drop", "warning", "A key performance metric is trending downward with high confidence.", [
      "Declining trend detected by the Intelligence Engine",
    ]);
  }

  if (acwr != null && acwr > OVERREACHING_ACWR_THRESHOLD) {
    push("overreaching", "critical", "Acute training load is far ahead of chronic load -- a strong overreaching signal.", [
      `ACWR ${acwr.toFixed(2)}`,
    ]);
  } else if (acwr != null && acwr < ABNORMAL_LOW_ACWR_THRESHOLD) {
    push("abnormal_training_load", "warning", "Training load has dropped sharply relative to recent history.", [
      `ACWR ${acwr.toFixed(2)}`,
    ]);
  }

  if (acwr != null && acwr < UNUSUAL_PATTERN_ACWR_THRESHOLD && recoveryScore != null && recoveryScore < UNUSUAL_PATTERN_RECOVERY_THRESHOLD) {
    push("unusual_recovery_pattern", "warning", "Recovery is low despite reduced training load -- an unusual pattern worth investigating.", [
      `ACWR ${acwr.toFixed(2)}`,
      `Recovery Score ${recoveryScore.toFixed(0)}%`,
    ]);
  }

  return alerts;
}
