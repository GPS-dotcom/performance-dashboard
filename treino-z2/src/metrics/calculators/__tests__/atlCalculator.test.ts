import { describe, expect, it } from "vitest";
import { calculateAtl, ATL_TIME_CONSTANT_DAYS } from "../atlCalculator";

describe("calculateAtl", () => {
  it("is unavailable with no daily loads", () => {
    expect(calculateAtl([]).value).toBeNull();
  });

  it("computes an EWMA series matching the standard 7-day time constant", () => {
    const result = calculateAtl([{ date: "2026-01-01", load: 100 }]);
    expect(result.value![0].value).toBeCloseTo(100 / ATL_TIME_CONSTANT_DAYS, 5);
  });

  it("reports high data quality once span >= 7 days", () => {
    const dailyLoads = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      load: 50,
    }));
    const result = calculateAtl(dailyLoads);
    expect(result.dataQuality).toBe("high");
  });

  it("reacts faster than CTL would to a single day's load (shorter time constant)", () => {
    const result = calculateAtl([{ date: "2026-01-01", load: 700 }]);
    // ATL after day 1 = 700/7 = 100, much larger fraction of the input than CTL's 700/42.
    expect(result.value![0].value).toBeCloseTo(100, 5);
  });
});
