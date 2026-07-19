// Coach Engine's Alert envelope. Per 10_COACH_ENGINE.md's "Escalation
// Rules": "The Coach should generate alerts when detecting: High Injury
// Risk, Extreme Fatigue, Rapid Performance Drop, Overreaching/
// Overtraining, Unusual Recovery Pattern, Abnormal Training Load. Alerts
// have higher priority than recommendations." Restated in the exact shape
// requested for this rebuild, with the 6 categories explicitly asked for
// in this task (overtraining risk, performance drop, elevated fatigue,
// injury risk, consistency loss, personal records -- the last one
// positive, not a danger signal, hence `severity: "info"` existing
// alongside "warning"/"critical").

export type AlertCategory = "overtraining_risk" | "performance_drop" | "elevated_fatigue" | "injury_risk" | "consistency_loss" | "personal_record";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  /** What the athlete should do about it, or null for a purely informational alert (e.g. a personal record). */
  actionRequired: string | null;
  /** ISO timestamp, always caller-supplied -- never read from the system clock. */
  generatedAt: string;
}
