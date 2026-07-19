import { describe, expect, it } from "vitest";
import { detectPersonalRecordAlert } from "../../alerts/personalRecordAlerts";
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

describe("detectPersonalRecordAlert", () => {
  it("returns null when there is no new personal best", () => {
    expect(detectPersonalRecordAlert(signals(), today)).toBeNull();
  });

  it("fires an info-severity alert with no action required when a PR was set", () => {
    const alert = detectPersonalRecordAlert(signals({ newPersonalBest: { distanceLabel: "5k", timeSec: 1100 } }), today);
    expect(alert?.severity).toBe("info");
    expect(alert?.category).toBe("personal_record");
    expect(alert?.actionRequired).toBeNull();
    expect(alert?.description).toContain("5k");
    expect(alert?.description).toContain("1100s");
  });

  it("suffixes the id with the distance label so multiple same-day PRs don't collide", () => {
    const alert = detectPersonalRecordAlert(signals({ newPersonalBest: { distanceLabel: "10k", timeSec: 2400 } }), today);
    expect(alert?.id).toBe(`alert:new_personal_best:${today}:10k`);
  });
});
