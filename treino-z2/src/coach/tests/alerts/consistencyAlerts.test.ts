import { describe, expect, it } from "vitest";
import { detectConsistencyLossAlert } from "../../alerts/consistencyAlerts";
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

describe("detectConsistencyLossAlert", () => {
  it("returns null when consistencyDeclining is false", () => {
    expect(detectConsistencyLossAlert(signals(), today)).toBeNull();
  });

  it("fires a warning using the evidence text when provided", () => {
    const alert = detectConsistencyLossAlert(signals({ consistencyDeclining: true, missedWeeksEvidence: "3 of the last 5 weeks had no recorded sessions" }), today);
    expect(alert?.severity).toBe("warning");
    expect(alert?.category).toBe("consistency_loss");
    expect(alert?.description).toBe("3 of the last 5 weeks had no recorded sessions");
  });

  it("falls back to a generic description when no evidence text is given", () => {
    const alert = detectConsistencyLossAlert(signals({ consistencyDeclining: true, missedWeeksEvidence: null }), today);
    expect(alert?.description).toBe("Training consistency has declined recently.");
  });
});
