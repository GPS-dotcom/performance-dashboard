import { describe, expect, it } from "vitest";
import { classifySeries } from "../../analyzers/shared/trendMath";
import type { MetricSeriesPoint } from "../../types/metricSeries";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("classifySeries", () => {
  it("returns null when there are fewer than MIN_TREND_POINTS points", () => {
    expect(classifySeries(series([1, 2, 3]), "higher_is_better")).toBeNull();
  });

  it("classifies a clearly rising series as improving under higher_is_better", () => {
    const result = classifySeries(series([40, 44, 48, 52, 56, 60]), "higher_is_better");
    expect(result?.direction).toBe("improving");
    expect(result?.slopePerDay).toBeGreaterThan(0);
  });

  it("classifies a clearly rising series as declining under lower_is_better (e.g. pace getting slower)", () => {
    const result = classifySeries(series([200, 205, 210, 215, 220, 225]), "lower_is_better");
    expect(result?.direction).toBe("declining");
  });

  it("classifies a clearly falling series as declining under higher_is_better", () => {
    const result = classifySeries(series([60, 56, 52, 48, 44, 40]), "higher_is_better");
    expect(result?.direction).toBe("declining");
  });

  it("classifies a clearly falling series as improving under lower_is_better (e.g. pace getting faster)", () => {
    const result = classifySeries(series([225, 220, 215, 210, 205, 200]), "lower_is_better");
    expect(result?.direction).toBe("improving");
  });

  it("classifies a flat series as stable", () => {
    const result = classifySeries(series([50, 50, 50, 50, 50, 50]), "higher_is_better");
    expect(result?.direction).toBe("stable");
  });

  it("classifies a series whose slope is small relative to its mean as stable", () => {
    // slope is nonzero but well under 1% of the mean per day
    const result = classifySeries(series([1000, 1000.1, 1000.2, 1000.3, 1000.4, 1000.5]), "higher_is_better");
    expect(result?.direction).toBe("stable");
  });

  it("sorts unordered input by date before classifying", () => {
    const points = series([40, 44, 48, 52, 56, 60]);
    const shuffled = [points[3], points[0], points[5], points[1], points[4], points[2]];
    const result = classifySeries(shuffled, "higher_is_better");
    expect(result?.sorted.map((p) => p.date)).toEqual(points.map((p) => p.date));
    expect(result?.direction).toBe("improving");
  });

  it("reports slopePerWeek as 7x slopePerDay", () => {
    const result = classifySeries(series([40, 44, 48, 52, 56, 60]), "higher_is_better");
    expect(result?.slopePerWeek).toBeCloseTo((result?.slopePerDay ?? 0) * 7, 10);
  });

  it("caps confidence contribution from point count at TREND_CONFIDENCE_SATURATION_POINTS", () => {
    const shortSeries = classifySeries(series([40, 44, 48, 52]), "higher_is_better");
    const longSeries = classifySeries(
      series(Array.from({ length: 20 }, (_, i) => 40 + i * 4)),
      "higher_is_better",
    );
    expect(longSeries!.confidence).toBeGreaterThanOrEqual(shortSeries!.confidence);
  });

  it("handles a zero-mean series without dividing by zero", () => {
    const result = classifySeries(series([-2, -1, 0, 1, 2, 3]), "higher_is_better");
    expect(result).not.toBeNull();
  });

  it("reports the correct pointCount", () => {
    const result = classifySeries(series([40, 44, 48, 52, 56, 60, 64]), "higher_is_better");
    expect(result?.pointCount).toBe(7);
  });
});
