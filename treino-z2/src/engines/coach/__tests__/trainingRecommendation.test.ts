import { describe, expect, it } from "vitest";
import { recommendTraining } from "../trainingRecommendation";
import type { TrainingSignals } from "../types";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return {
    recoveryScore: null,
    recoveryScoreTrend: null,
    atlTrend: null,
    hrDriftTrend: null,
    lt1Trend: null,
    tsb: null,
    injuryRiskLevel: null,
    ...overrides,
  };
}

describe("recommendTraining", () => {
  it("matches COACH_ENGINE.md's worked example exactly: fatigue increased -> Easy Run, 92%", () => {
    const result = recommendTraining(
      signals({ atlTrend: "increasing", hrDriftTrend: "increasing", recoveryScoreTrend: "decreasing" }),
    );
    expect(result).toEqual({
      recommendation: "Easy Run",
      reason: "Fatigue increased.",
      evidence: ["ATL increased", "HR Drift increased", "Recovery Score decreased"],
      confidence: 0.92,
      expectedOutcome: "Improved recovery for tomorrow's quality session.",
      alternative: "If fatigue persists tomorrow, consider a full Rest day.",
    });
  });

  it("matches COACH_ENGINE.md's worked example exactly: recovery high, fatigue low -> Threshold, 95%", () => {
    const result = recommendTraining(
      signals({ recoveryScore: 91, hrDriftTrend: "decreasing", lt1Trend: "increasing" }),
    );
    expect(result).toEqual({
      recommendation: "Threshold",
      reason: "Recovery is high and fatigue is low.",
      evidence: ["Recovery Score 91%", "HR Drift improving", "LT1 trending upward"],
      confidence: 0.95,
      expectedOutcome: "Builds fitness while recovery capacity is high.",
      alternative: "If fatigue increases tomorrow, replace with Easy Run.",
    });
  });

  it("recommends Rest when injury risk is high, overriding every other signal", () => {
    const result = recommendTraining(signals({ injuryRiskLevel: "high", recoveryScore: 91 }));
    expect(result.recommendation).toBe("Rest");
    expect(result.confidence).toBe(0.85);
  });

  it("recommends Recovery Week when recovery is critically low", () => {
    const result = recommendTraining(signals({ recoveryScore: 20 }));
    expect(result.recommendation).toBe("Recovery Week");
  });

  it("recommends Recovery Week when TSB is critically negative even without a recovery score", () => {
    const result = recommendTraining(signals({ tsb: -35 }));
    expect(result.recommendation).toBe("Recovery Week");
  });

  it("recommends Recovery Run for moderately low recovery outside the exact fatigue-increased pattern", () => {
    const result = recommendTraining(signals({ recoveryScore: 45 }));
    expect(result.recommendation).toBe("Recovery Run");
  });

  it("recommends Long Run for good (but not exact-Threshold-pattern) recovery", () => {
    const result = recommendTraining(signals({ recoveryScore: 75 }));
    expect(result.recommendation).toBe("Long Run");
  });

  it("falls back to Easy Run with low confidence when no signal is available", () => {
    const result = recommendTraining(signals());
    expect(result.recommendation).toBe("Easy Run");
    expect(result.evidence).toEqual([]);
    expect(result.confidence).toBeLessThan(0.92);
  });

  it("never exceeds the spec's own calibration confidence in a generic (non-exact-match) branch", () => {
    const result = recommendTraining(signals({ recoveryScore: 75 }));
    expect(result.confidence).toBeLessThan(0.92);
  });
});
