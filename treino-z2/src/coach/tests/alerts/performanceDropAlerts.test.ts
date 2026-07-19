import { describe, expect, it } from "vitest";
import { detectPerformanceDropAlert } from "../../alerts/performanceDropAlerts";
import type { AlertSignals } from "../../types/signals";

const today = "2026-07-18";

function signals(overrides: Partial<AlertSignals> = {}): AlertSignals {
  return {
    injuryRiskLevel: null,
    tsb: null,
    recoveryScore: null,
    acwr: null,
    performanceTrendDeclining: false,
    consistencyDeclining: false,
    missedWeeksEvidence: null,
    newPersonalBest: null,
    ...overrides,
  };
}

describe("detectPerformanceDropAlert", () => {
  it("fires a warning when performanceTrendDeclining is true", () => {
    const alert = detectPerformanceDropAlert(signals({ performanceTrendDeclining: true }), today);
    expect(alert?.severity).toBe("warning");
    expect(alert?.category).toBe("performance_drop");
  });

  it("returns null when performanceTrendDeclining is false", () => {
    expect(detectPerformanceDropAlert(signals({ performanceTrendDeclining: false }), today)).toBeNull();
  });
});
