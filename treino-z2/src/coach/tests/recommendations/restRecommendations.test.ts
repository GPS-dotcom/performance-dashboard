import { describe, expect, it } from "vitest";
import { generateRestRecommendation } from "../../recommendations/restRecommendations";
import type { TrainingSignals } from "../../types/signals";

const today = "2026-07-18";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("generateRestRecommendation", () => {
  it("fires when injury risk is high", () => {
    const rec = generateRestRecommendation(signals({ injuryRiskLevel: "high" }), today);
    expect(rec?.title).toBe("Full Rest Day");
    expect(rec?.confidence).toBe(0.85);
  });

  it("fires when TSB is extremely negative", () => {
    const rec = generateRestRecommendation(signals({ tsb: -35 }), today);
    expect(rec?.title).toBe("Full Rest Day");
    expect(rec?.supportingMetrics).toEqual(["tsb"]);
  });

  it("fires when recovery score is critically low", () => {
    const rec = generateRestRecommendation(signals({ recoveryScore: 20 }), today);
    expect(rec?.supportingMetrics).toEqual(["recovery_score"]);
  });

  it("combines both supporting metrics when both extreme-fatigue signals are present", () => {
    const rec = generateRestRecommendation(signals({ tsb: -35, recoveryScore: 20 }), today);
    expect(rec?.supportingMetrics).toEqual(["tsb", "recovery_score"]);
  });

  it("returns null when nothing warrants a full rest day", () => {
    expect(generateRestRecommendation(signals({ recoveryScore: 70 }), today)).toBeNull();
  });

  it("every non-null result is type 'rest'", () => {
    expect(generateRestRecommendation(signals({ injuryRiskLevel: "high" }), today)?.type).toBe("rest");
  });
});
