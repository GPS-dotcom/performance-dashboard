import { describe, expect, it } from "vitest";
import { generateIntensityRecommendation } from "../../recommendations/intensityRecommendations";
import type { TrainingSignals } from "../../types/signals";

const today = "2026-07-18";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("generateIntensityRecommendation", () => {
  it("recommends Rest when injury risk is high, regardless of other signals", () => {
    const rec = generateIntensityRecommendation(signals({ injuryRiskLevel: "high", recoveryScore: 90 }), today);
    expect(rec.title).toBe("Rest");
    expect(rec.confidence).toBe(0.85);
  });

  it("recommends Recovery Week when recovery score or TSB is critically low", () => {
    expect(generateIntensityRecommendation(signals({ recoveryScore: 20 }), today).title).toBe("Recovery Week");
    expect(generateIntensityRecommendation(signals({ tsb: -35 }), today).title).toBe("Recovery Week");
  });

  it("recommends Easy Run for the spec's exact 'fatigue increased' pattern, at 0.92 confidence", () => {
    const rec = generateIntensityRecommendation(signals({ atlTrend: "increasing", hrDriftTrend: "increasing", recoveryScoreTrend: "decreasing" }), today);
    expect(rec.title).toBe("Easy Run");
    expect(rec.confidence).toBe(0.92);
  });

  it("recommends Recovery Run when recovery is below 50", () => {
    expect(generateIntensityRecommendation(signals({ recoveryScore: 45 }), today).title).toBe("Recovery Run");
  });

  it("recommends Threshold for the spec's exact 'recovery high, fatigue low' pattern, at 0.95 confidence", () => {
    const rec = generateIntensityRecommendation(signals({ recoveryScore: 90, hrDriftTrend: "decreasing", lt1Trend: "increasing" }), today);
    expect(rec.title).toBe("Threshold");
    expect(rec.confidence).toBe(0.95);
  });

  it("recommends Long Run when recovery is good (>=70) without the stricter Threshold pattern", () => {
    expect(generateIntensityRecommendation(signals({ recoveryScore: 75 }), today).title).toBe("Long Run");
  });

  it("defaults to Easy Run when no signal points strongly in either direction", () => {
    const rec = generateIntensityRecommendation(signals(), today);
    expect(rec.title).toBe("Easy Run");
    expect(rec.reasoning).toContain("No strong signal");
  });

  it("every result is type 'intensity' with a createdAt matching the input", () => {
    const rec = generateIntensityRecommendation(signals(), today);
    expect(rec.type).toBe("intensity");
    expect(rec.createdAt).toBe(today);
  });
});
