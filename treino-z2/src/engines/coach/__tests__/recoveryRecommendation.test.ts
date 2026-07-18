import { describe, expect, it } from "vitest";
import { recommendRecovery } from "../recoveryRecommendation";
import type { RecoverySignals } from "../recoveryRecommendation";

function signals(overrides: Partial<RecoverySignals> = {}): RecoverySignals {
  return {
    recoveryScore: 80,
    acwr: 1.0,
    hrDriftTrend: null,
    hasWearableRecoveryData: true,
    ...overrides,
  };
}

describe("recommendRecovery", () => {
  it("recommends a Recovery Day when recovery is critically low", () => {
    const recs = recommendRecovery(signals({ recoveryScore: 20 }));
    expect(recs.some((r) => r.recommendation === "Recovery Day")).toBe(true);
  });

  it("recommends Lower Intensity (not a full Recovery Day) for moderately low recovery", () => {
    const recs = recommendRecovery(signals({ recoveryScore: 40 }));
    expect(recs.some((r) => r.recommendation === "Lower Intensity")).toBe(true);
    expect(recs.some((r) => r.recommendation === "Recovery Day")).toBe(false);
  });

  it("recommends Lower Intensity when ACWR is above the danger threshold, even with good recovery score", () => {
    const recs = recommendRecovery(signals({ recoveryScore: 80, acwr: 1.8 }));
    expect(recs.some((r) => r.recommendation === "Lower Intensity")).toBe(true);
  });

  it("recommends Mobility when HR Drift is trending up", () => {
    const recs = recommendRecovery(signals({ hrDriftTrend: "increasing" }));
    expect(recs.some((r) => r.recommendation === "Mobility")).toBe(true);
  });

  it("recommends Sleep Priority when no wearable recovery data is tracked", () => {
    const recs = recommendRecovery(signals({ hasWearableRecoveryData: false }));
    expect(recs.some((r) => r.recommendation === "Sleep Priority")).toBe(true);
  });

  it("returns no recommendations when everything looks fine and wearable data exists", () => {
    const recs = recommendRecovery(signals());
    expect(recs).toEqual([]);
  });

  it("can return multiple simultaneous recommendations", () => {
    const recs = recommendRecovery(
      signals({ recoveryScore: 40, hrDriftTrend: "increasing", hasWearableRecoveryData: false }),
    );
    expect(recs.map((r) => r.recommendation)).toEqual(["Lower Intensity", "Mobility", "Sleep Priority"]);
  });
});
