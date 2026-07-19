import { describe, expect, it } from "vitest";
import { detectElevatedFatigueAlert } from "../../alerts/fatigueAlerts";
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

describe("detectElevatedFatigueAlert", () => {
  it("fires critical when TSB is extremely negative", () => {
    const alert = detectElevatedFatigueAlert(signals({ tsb: -35 }), today);
    expect(alert?.severity).toBe("critical");
    expect(alert?.category).toBe("elevated_fatigue");
  });

  it("fires warning when recovery score is critically low, if TSB isn't extreme", () => {
    const alert = detectElevatedFatigueAlert(signals({ recoveryScore: 15 }), today);
    expect(alert?.severity).toBe("warning");
  });

  it("prioritizes the TSB check over the recovery score check when both apply", () => {
    const alert = detectElevatedFatigueAlert(signals({ tsb: -35, recoveryScore: 15 }), today);
    expect(alert?.severity).toBe("critical");
  });

  it("returns null when neither signal is extreme", () => {
    expect(detectElevatedFatigueAlert(signals({ tsb: -10, recoveryScore: 60 }), today)).toBeNull();
  });
});
