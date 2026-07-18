import { describe, expect, it } from "vitest";
import { calculateFatigueScore } from "../fatigueScoreCalculator";

describe("calculateFatigueScore", () => {
  it("is unavailable with no ATL history", () => {
    expect(calculateFatigueScore({ atl: 50, atlHistory: [] }).value).toBeNull();
  });

  it("scores at the top of the athlete's own ATL range as 100", () => {
    const result = calculateFatigueScore({ atl: 80, atlHistory: [40, 50, 60, 70, 80] });
    expect(result.value).toBeCloseTo(100, 5);
  });

  it("scores at the bottom of the athlete's own ATL range as 0", () => {
    const result = calculateFatigueScore({ atl: 40, atlHistory: [40, 50, 60, 70, 80] });
    expect(result.value).toBeCloseTo(0, 5);
  });

  it("reports high data quality with >= 7 days of history", () => {
    const history = Array.from({ length: 7 }, (_, i) => 40 + i);
    const result = calculateFatigueScore({ atl: 45, atlHistory: history });
    expect(result.dataQuality).toBe("high");
    expect(result.missingInputs).toEqual([]);
  });

  it("reports low data quality with fewer than 7 days", () => {
    const result = calculateFatigueScore({ atl: 50, atlHistory: [40, 60] });
    expect(result.dataQuality).toBe("low");
    expect(result.missingInputs.length).toBeGreaterThan(0);
  });
});
