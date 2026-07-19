import { describe, expect, it } from "vitest";
import { linearTrendModel, predictLinearTrend } from "../../algorithms/linearTrendModel";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("predictLinearTrend", () => {
  it("returns an unavailable output with fewer than 4 points", () => {
    const output = predictLinearTrend({ series: series([40, 42, 44]), daysAhead: 7 });
    expect(output.value).toBeNull();
    expect(output.confidence).toBe(0);
  });

  it("projects a clean linear trend forward correctly", () => {
    // +2 per day
    const output = predictLinearTrend({ series: series([40, 42, 44, 46, 48, 50]), daysAhead: 7 });
    expect(output.value!.slopePerDay).toBeCloseTo(2, 5);
    expect(output.value!.rSquared).toBeCloseTo(1, 5);
    // last point is day 5 (0-indexed) at value 50; 7 days ahead -> day 12 -> 50 + 2*7 = 64
    expect(output.value!.projectedValue).toBeCloseTo(64, 5);
  });

  it("sorts unordered input by date before fitting", () => {
    const points = series([40, 42, 44, 46, 48, 50]);
    const shuffled = [points[3], points[0], points[5], points[1], points[4], points[2]];
    const output = predictLinearTrend({ series: shuffled, daysAhead: 7 });
    expect(output.value!.slopePerDay).toBeCloseTo(2, 5);
  });

  it("gives a real prediction interval (lowerBound < value < upperBound) for a noisy but positive-slope series", () => {
    const noisy = series([40, 43, 41, 46, 44, 50]);
    const output = predictLinearTrend({ series: noisy, daysAhead: 7 });
    expect(output.lowerBound).not.toBeNull();
    expect(output.upperBound).not.toBeNull();
    expect(output.lowerBound!).toBeLessThanOrEqual(output.value!.projectedValue);
    expect(output.upperBound!).toBeGreaterThanOrEqual(output.value!.projectedValue);
  });

  it("flags projecting further ahead than the available history span as a missing input", () => {
    // history spans 5 days; projecting 30 days ahead is a large extrapolation
    const output = predictLinearTrend({ series: series([40, 42, 44, 46, 48]), daysAhead: 30 });
    expect(output.missingInputs).toContain("projecting further ahead than the available history span");
  });

  it("reduces confidence as the extrapolation ratio grows, holding fit quality constant", () => {
    const clean = series([40, 42, 44, 46, 48, 50]);
    const near = predictLinearTrend({ series: clean, daysAhead: 2 });
    const far = predictLinearTrend({ series: clean, daysAhead: 60 });
    expect(far.confidence).toBeLessThan(near.confidence);
  });
});

describe("linearTrendModel", () => {
  it("exposes a stable modelId/version and delegates to predictLinearTrend", () => {
    expect(linearTrendModel.modelId).toBe("linear-trend-extrapolation");
    const output = linearTrendModel.predict({ series: series([40, 42, 44, 46, 48, 50]), daysAhead: 7 });
    expect(output.value).not.toBeNull();
  });
});
