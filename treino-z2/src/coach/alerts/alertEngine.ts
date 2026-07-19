import { detectConsistencyLossAlert } from "./consistencyAlerts";
import { detectElevatedFatigueAlert } from "./fatigueAlerts";
import { detectInjuryRiskAlert } from "./injuryRiskAlerts";
import { detectOvertrainingRiskAlert } from "./overtrainingAlerts";
import { detectPerformanceDropAlert } from "./performanceDropAlerts";
import { detectPersonalRecordAlert } from "./personalRecordAlerts";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

/**
 * Alert Engine: runs all 6 requested alert categories (overtraining risk,
 * performance drop, elevated fatigue, injury risk, consistency loss,
 * personal records) and returns every one that fires -- per
 * 10_COACH_ENGINE.md's Escalation Rules, "Alerts have higher priority
 * than recommendations," so callers (e.g. the Daily Brief Generator) are
 * responsible for surfacing these ahead of any recommendation.
 */
export function detectAlerts(signals: AlertSignals, generatedAt: string): Alert[] {
  const detectors = [
    detectInjuryRiskAlert,
    detectElevatedFatigueAlert,
    detectPerformanceDropAlert,
    detectOvertrainingRiskAlert,
    detectConsistencyLossAlert,
    detectPersonalRecordAlert,
  ];

  const alerts: Alert[] = [];
  for (const detect of detectors) {
    const alert = detect(signals, generatedAt);
    if (alert) alerts.push(alert);
  }
  return alerts;
}
