import { describe, expect, it } from "vitest";
import { calculateFitnessScore } from "../fitnessScore";

describe("calculateFitnessScore", () => {
  it("normalizes CTL against the athlete's own history into a 0-100 score", () => {
    const result = calculateFitnessScore({ ctl: 60, ctlHistory: [40, 45, 50, 55, 60, 65, 70] });
    // min=40, max=70, range=30; (60-40)/30*100 = 66.666...
    expect(result.value).toBeCloseTo(66.667, 2);
    expect(result.dataQuality).toBe("low"); // only 7 days of history
  });

  it("reaches high data quality with >= 14 days of history", () => {
    const history = Array.from({ length: 14 }, (_, i) => 40 + i);
    const result = calculateFitnessScore({ ctl: 53, ctlHistory: history });
    expect(result.dataQuality).toBe("high");
    expect(result.confidence).toBeCloseTo(1, 6);
  });

  it("returns 50 as a neutral score when history has zero range", () => {
    const result = calculateFitnessScore({ ctl: 50, ctlHistory: [50] });
    expect(result.value).toBe(50);
  });

  it("is unavailable with no CTL history", () => {
    const result = calculateFitnessScore({ ctl: 60, ctlHistory: [] });
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("no CTL history to normalize against");
  });

  it("clamps the score into [0, 100] even if the current CTL extends the range", () => {
    const result = calculateFitnessScore({ ctl: 100, ctlHistory: [40, 50, 60] });
    expect(result.value).toBe(100);
  });
});
