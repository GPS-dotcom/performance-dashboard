import { describe, expect, it } from "vitest";
import { detectOvertrainingRiskAlert } from "../../alerts/overtrainingAlerts";
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

describe("detectOvertrainingRiskAlert", () => {
  it("fires critical 'Overreaching' when ACWR is far above the danger threshold", () => {
    const alert = detectOvertrainingRiskAlert(signals({ acwr: 2.5 }), today);
    expect(alert?.severity).toBe("critical");
    expect(alert?.title).toBe("Overreaching");
  });

  it("fires warning 'Abnormal Training Load Drop' when ACWR has collapsed", () => {
    const alert = detectOvertrainingRiskAlert(signals({ acwr: 0.3 }), today);
    expect(alert?.severity).toBe("warning");
    expect(alert?.title).toBe("Abnormal Training Load Drop");
  });

  it("returns null within the normal ACWR range", () => {
    expect(detectOvertrainingRiskAlert(signals({ acwr: 1.0 }), today)).toBeNull();
  });

  it("every result is category 'overtraining_risk'", () => {
    expect(detectOvertrainingRiskAlert(signals({ acwr: 2.5 }), today)?.category).toBe("overtraining_risk");
  });
});
