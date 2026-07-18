import { describe, expect, it } from "vitest";
import {
  analyzeFitnessEvolution,
  analyzeHeartRateEvolution,
  analyzeLoadEvolution,
  analyzePaceEvolution,
  analyzePowerEvolution,
  analyzeTrend,
  buildTrendInsight,
} from "../../analyzers/trendAnalyzer";
import { classifySeries } from "../../analyzers/shared/trendMath";
import type { MetricSeriesPoint } from "../../types/metricSeries";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

const rising = series([40, 44, 48, 52, 56, 60]);
const falling = series([60, 56, 52, 48, 44, 40]);
const flat = series([50, 50, 50, 50, 50, 50]);
const today = "2026-06-06";

describe("analyzeTrend", () => {
  it("returns null when the underlying classification is null (too few points)", () => {
    expect(analyzeTrend("Fitness", "ctl", series([1, 2]), "higher_is_better", "fitness", today)).toBeNull();
  });

  it("produces an improving insight for a rising, higher_is_better series", () => {
    const insight = analyzeTrend("Fitness", "ctl", rising, "higher_is_better", "fitness", today);
    expect(insight?.title).toBe("Fitness Improving");
    expect(insight?.severity).toBe("information");
    expect(insight?.category).toBe("fitness");
    expect(insight?.relatedMetrics).toEqual(["ctl"]);
    expect(insight?.date).toBe(today);
    expect(insight?.id).toBe(`insight:trend_ctl_improving:${today}`);
  });

  it("produces a declining insight (with warning severity) for a falling, higher_is_better series", () => {
    const insight = analyzeTrend("Fitness", "ctl", falling, "higher_is_better", "fitness", today);
    expect(insight?.title).toBe("Fitness Declining");
    expect(insight?.severity).toBe("warning");
  });

  it("produces a stable insight for a flat series", () => {
    const insight = analyzeTrend("Fitness", "ctl", flat, "higher_is_better", "fitness", today);
    expect(insight?.title).toBe("Fitness Stable");
    expect(insight?.severity).toBe("information");
  });

  it("includes point count and slope/R² evidence", () => {
    const insight = analyzeTrend("Fitness", "ctl", rising, "higher_is_better", "fitness", today);
    expect(insight?.evidence[0]).toContain("6 data points");
    expect(insight?.evidence[1]).toMatch(/slope .* per week/);
  });
});

describe("buildTrendInsight", () => {
  it("produces the same Insight as analyzeTrend for an already-computed classification, without re-running the regression", () => {
    const trend = classifySeries(rising, "higher_is_better")!;
    const viaHelper = buildTrendInsight("Fitness", "ctl", trend, "fitness", today);
    const viaAnalyzeTrend = analyzeTrend("Fitness", "ctl", rising, "higher_is_better", "fitness", today);
    expect(viaHelper).toEqual(viaAnalyzeTrend);
  });
});

describe("named trend wrappers", () => {
  it("analyzeFitnessEvolution reports category fitness and metric ctl", () => {
    const insight = analyzeFitnessEvolution(rising, today);
    expect(insight?.category).toBe("fitness");
    expect(insight?.relatedMetrics).toEqual(["ctl"]);
  });

  it("analyzeLoadEvolution reports category training_load", () => {
    const insight = analyzeLoadEvolution(rising, today);
    expect(insight?.category).toBe("training_load");
    expect(insight?.relatedMetrics).toEqual(["training_load"]);
  });

  it("analyzePowerEvolution reports category fitness and metric critical_power", () => {
    const insight = analyzePowerEvolution(rising, today);
    expect(insight?.category).toBe("fitness");
    expect(insight?.relatedMetrics).toEqual(["critical_power"]);
  });

  it("analyzePaceEvolution treats a falling series (faster pace) as improving, since pace is lower_is_better", () => {
    const insight = analyzePaceEvolution(falling, today);
    expect(insight?.title).toBe("Pace Improving");
  });

  it("analyzeHeartRateEvolution treats a falling series (lower HR) as improving, and reports category physiology", () => {
    const insight = analyzeHeartRateEvolution(falling, today);
    expect(insight?.title).toBe("Heart Rate Improving");
    expect(insight?.category).toBe("physiology");
  });
});
