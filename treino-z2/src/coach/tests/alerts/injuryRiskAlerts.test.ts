import { describe, expect, it } from "vitest";
import { detectInjuryRiskAlert } from "../../alerts/injuryRiskAlerts";
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

describe("detectInjuryRiskAlert", () => {
  it("fires with critical severity when injury risk is high", () => {
    const alert = detectInjuryRiskAlert(signals({ injuryRiskLevel: "high" }), today);
    expect(alert?.severity).toBe("critical");
    expect(alert?.category).toBe("injury_risk");
    expect(alert?.actionRequired).not.toBeNull();
  });

  it("returns null when injury risk is not high", () => {
    expect(detectInjuryRiskAlert(signals({ injuryRiskLevel: "moderate" }), today)).toBeNull();
    expect(detectInjuryRiskAlert(signals({ injuryRiskLevel: null }), today)).toBeNull();
  });
});
