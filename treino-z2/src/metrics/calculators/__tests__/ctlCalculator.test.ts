import { describe, expect, it } from "vitest";
import { calculateCtl, CTL_TIME_CONSTANT_DAYS } from "../ctlCalculator";

describe("calculateCtl", () => {
  it("is unavailable with no daily loads", () => {
    expect(calculateCtl([]).value).toBeNull();
  });

  it("computes an EWMA series matching the standard 42-day time constant", () => {
    const result = calculateCtl([{ date: "2026-01-01", load: 100 }]);
    expect(result.value![0].value).toBeCloseTo(100 / CTL_TIME_CONSTANT_DAYS, 5);
  });

  it("reports high data quality once span >= 42 days", () => {
    const dailyLoads = Array.from({ length: 42 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      load: 50,
    }));
    const result = calculateCtl(dailyLoads);
    expect(result.dataQuality).toBe("high");
    expect(result.missingInputs).toEqual([]);
  });

  it("reports low data quality with a short span", () => {
    const result = calculateCtl([{ date: "2026-01-01", load: 50 }]);
    expect(result.dataQuality).toBe("low");
    expect(result.missingInputs.length).toBeGreaterThan(0);
  });
});
