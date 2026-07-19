import { describe, expect, it } from "vitest";
import { detectAlerts } from "../../alerts/alertEngine";
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

describe("detectAlerts", () => {
  it("returns an empty array when nothing applies", () => {
    expect(detectAlerts(signals(), today)).toEqual([]);
  });

  it("returns every alert that fires, across multiple categories at once", () => {
    const alerts = detectAlerts(
      signals({ injuryRiskLevel: "high", performanceTrendDeclining: true, newPersonalBest: { distanceLabel: "5k", timeSec: 1100 } }),
      today,
    );
    expect(alerts.map((a) => a.category).sort()).toEqual(["injury_risk", "performance_drop", "personal_record"].sort());
  });

  it("runs all 6 requested categories -- verified by triggering each independently", () => {
    expect(detectAlerts(signals({ injuryRiskLevel: "high" }), today)[0].category).toBe("injury_risk");
    expect(detectAlerts(signals({ tsb: -35 }), today)[0].category).toBe("elevated_fatigue");
    expect(detectAlerts(signals({ performanceTrendDeclining: true }), today)[0].category).toBe("performance_drop");
    expect(detectAlerts(signals({ acwr: 2.5 }), today)[0].category).toBe("overtraining_risk");
    expect(detectAlerts(signals({ consistencyDeclining: true }), today)[0].category).toBe("consistency_loss");
    expect(detectAlerts(signals({ newPersonalBest: { distanceLabel: "5k", timeSec: 1100 } }), today)[0].category).toBe("personal_record");
  });
});
