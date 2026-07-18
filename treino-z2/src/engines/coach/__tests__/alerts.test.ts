import { describe, expect, it } from "vitest";
import { detectAlerts } from "../alerts";
import type { AlertSignals } from "../alerts";

function signals(overrides: Partial<AlertSignals> = {}): AlertSignals {
  return {
    injuryRiskLevel: "low",
    tsb: 5,
    recoveryScore: 70,
    acwr: 1.0,
    performanceTrendDeclining: false,
    ...overrides,
  };
}

describe("detectAlerts", () => {
  it("returns no alerts when everything is within normal ranges", () => {
    expect(detectAlerts(signals())).toEqual([]);
  });

  it("raises a critical high_injury_risk alert", () => {
    const alerts = detectAlerts(signals({ injuryRiskLevel: "high" }));
    expect(alerts).toContainEqual({
      kind: "high_injury_risk",
      severity: "critical",
      message: "Injury risk is elevated based on current training load.",
      evidence: ["Injury risk: high"],
    });
  });

  it("raises a critical extreme_fatigue alert from TSB before falling back to recovery score", () => {
    const alerts = detectAlerts(signals({ tsb: -35, recoveryScore: 70 }));
    expect(alerts.filter((a) => a.kind === "extreme_fatigue")).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: "extreme_fatigue", severity: "critical" });
  });

  it("raises a warning extreme_fatigue alert from a critically low recovery score alone", () => {
    const alerts = detectAlerts(signals({ tsb: 5, recoveryScore: 15 }));
    expect(alerts).toContainEqual({
      kind: "extreme_fatigue",
      severity: "warning",
      message: "Recovery is critically low.",
      evidence: ["Recovery Score 15%"],
    });
  });

  it("raises rapid_performance_drop when a declining trend is flagged", () => {
    const alerts = detectAlerts(signals({ performanceTrendDeclining: true }));
    expect(alerts.some((a) => a.kind === "rapid_performance_drop")).toBe(true);
  });

  it("raises a critical overreaching alert for very high ACWR", () => {
    const alerts = detectAlerts(signals({ acwr: 2.5 }));
    expect(alerts).toContainEqual({
      kind: "overreaching",
      severity: "critical",
      message: "Acute training load is far ahead of chronic load -- a strong overreaching signal.",
      evidence: ["ACWR 2.50"],
    });
  });

  it("raises abnormal_training_load for a sharp drop in ACWR", () => {
    const alerts = detectAlerts(signals({ acwr: 0.3 }));
    expect(alerts.some((a) => a.kind === "abnormal_training_load")).toBe(true);
  });

  it("raises unusual_recovery_pattern when recovery is low despite reduced training load", () => {
    const alerts = detectAlerts(signals({ acwr: 0.4, recoveryScore: 40 }));
    expect(alerts.some((a) => a.kind === "unusual_recovery_pattern")).toBe(true);
    // Also fires abnormal_training_load independently -- the two are not mutually exclusive.
    expect(alerts.some((a) => a.kind === "abnormal_training_load")).toBe(true);
  });

  it("can raise multiple independent alerts at once", () => {
    const alerts = detectAlerts(signals({ injuryRiskLevel: "high", acwr: 2.5, performanceTrendDeclining: true }));
    expect(alerts.map((a) => a.kind).sort()).toEqual(["high_injury_risk", "overreaching", "rapid_performance_drop"].sort());
  });
});
