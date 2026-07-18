import { describe, expect, it } from "vitest";
import { calculateFitnessScore } from "../fitnessScoreCalculator";

describe("calculateFitnessScore", () => {
  it("is unavailable with no CTL history", () => {
    expect(calculateFitnessScore({ ctl: 50, ctlHistory: [] }).value).toBeNull();
  });

  it("scores at the top of the athlete's own range as 100", () => {
    const result = calculateFitnessScore({ ctl: 80, ctlHistory: [40, 50, 60, 70, 80] });
    expect(result.value).toBeCloseTo(100, 5);
  });

  it("scores at the bottom of the athlete's own range as 0", () => {
    const result = calculateFitnessScore({ ctl: 40, ctlHistory: [40, 50, 60, 70, 80] });
    expect(result.value).toBeCloseTo(0, 5);
  });

  it("reports high data quality with >= 14 days of history", () => {
    const history = Array.from({ length: 14 }, (_, i) => 40 + i);
    const result = calculateFitnessScore({ ctl: 55, ctlHistory: history });
    expect(result.dataQuality).toBe("high");
    expect(result.missingInputs).toEqual([]);
  });

  it("reports low data quality with fewer than 14 days", () => {
    const result = calculateFitnessScore({ ctl: 50, ctlHistory: [40, 60] });
    expect(result.dataQuality).toBe("low");
    expect(result.missingInputs.length).toBeGreaterThan(0);
  });
});
