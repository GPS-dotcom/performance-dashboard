import { describe, expect, it } from "vitest";
import { classifySeries } from "../../intelligence";
import type { MetricPolarity, MetricSeriesPoint } from "../../intelligence";
import { rawDirectionFromTrend } from "../assembleDailyBrief";

function series(values: number[], startDate = "2026-01-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

/** What assembleDailyBrief's old rawDirection() did: a second, independent classifySeries call. */
function rawDirectionBySecondCall(points: MetricSeriesPoint[]): string | null {
  const trend = classifySeries(points, "higher_is_better");
  if (!trend) return null;
  if (trend.direction === "stable") return "stable";
  return trend.direction === "improving" ? "increasing" : "decreasing";
}

describe("rawDirectionFromTrend", () => {
  const cases: { name: string; values: number[]; polarity: MetricPolarity }[] = [
    { name: "rising series, higher_is_better", values: [40, 42, 44, 46, 48, 50], polarity: "higher_is_better" },
    { name: "falling series, higher_is_better", values: [50, 48, 46, 44, 42, 40], polarity: "higher_is_better" },
    { name: "rising series, lower_is_better", values: [40, 42, 44, 46, 48, 50], polarity: "lower_is_better" },
    { name: "falling series, lower_is_better", values: [50, 48, 46, 44, 42, 40], polarity: "lower_is_better" },
    { name: "flat series", values: [50, 50, 50, 50, 50, 50], polarity: "higher_is_better" },
    { name: "flat series, lower_is_better", values: [50, 50, 50, 50, 50, 50], polarity: "lower_is_better" },
    { name: "too few points", values: [40, 42], polarity: "higher_is_better" },
  ];

  for (const { name, values, polarity } of cases) {
    it(`matches a second, independent classifySeries("higher_is_better") call for: ${name}`, () => {
      const points = series(values);
      const trend = classifySeries(points, polarity);
      const fast = rawDirectionFromTrend(trend, polarity);
      const slow = rawDirectionBySecondCall(points);
      expect(fast).toBe(slow);
    });
  }

  it("returns null when there's no trend to derive a direction from", () => {
    expect(rawDirectionFromTrend(null, "higher_is_better")).toBeNull();
  });
});
