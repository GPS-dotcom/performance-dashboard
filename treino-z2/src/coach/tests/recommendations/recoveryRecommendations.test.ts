import { describe, expect, it } from "vitest";
import { generateRecoveryRecommendations } from "../../recommendations/recoveryRecommendations";
import type { RecoverySignals } from "../../types/signals";

const today = "2026-07-18";

function signals(overrides: Partial<RecoverySignals> = {}): RecoverySignals {
  return { recoveryScore: 60, acwr: 1.0, hrDriftTrend: null, hasWearableRecoveryData: true, ...overrides };
}

describe("generateRecoveryRecommendations", () => {
  it("recommends Recovery Day when recovery score is critically low", () => {
    const recs = generateRecoveryRecommendations(signals({ recoveryScore: 20 }), today);
    expect(recs.some((r) => r.title === "Recovery Day")).toBe(true);
  });

  it("recommends Lower Intensity when recovery is moderately low or ACWR is high, but not critically low", () => {
    const recs = generateRecoveryRecommendations(signals({ recoveryScore: 40 }), today);
    expect(recs.some((r) => r.title === "Lower Intensity")).toBe(true);
    expect(recs.some((r) => r.title === "Recovery Day")).toBe(false);
  });

  it("recommends Mobility when HR Drift is trending up", () => {
    const recs = generateRecoveryRecommendations(signals({ hrDriftTrend: "increasing" }), today);
    expect(recs.some((r) => r.title === "Mobility")).toBe(true);
  });

  it("recommends Sleep Priority when no wearable recovery data is tracked", () => {
    const recs = generateRecoveryRecommendations(signals({ hasWearableRecoveryData: false }), today);
    expect(recs.some((r) => r.title === "Sleep Priority")).toBe(true);
  });

  it("returns multiple simultaneously-applicable recommendations, not just one", () => {
    const recs = generateRecoveryRecommendations(signals({ recoveryScore: 20, hrDriftTrend: "increasing", hasWearableRecoveryData: false }), today);
    expect(recs.map((r) => r.title)).toEqual(["Recovery Day", "Mobility", "Sleep Priority"]);
  });

  it("returns no recommendations when everything looks fine and wearable data exists", () => {
    const recs = generateRecoveryRecommendations(signals(), today);
    expect(recs).toEqual([]);
  });

  it("every recommendation is type 'recovery' and references supportingMetrics", () => {
    const recs = generateRecoveryRecommendations(signals({ recoveryScore: 20, acwr: 2.0 }), today);
    for (const r of recs) {
      expect(r.type).toBe("recovery");
    }
    expect(recs[0].supportingMetrics).toContain("recovery_score");
  });
});
