import { describe, expect, it } from "vitest";
import { analyzeTrainingLoadTrend, latestTrainingLoadPoint } from "../trainingLoadTrendAnalyzer";

describe("analyzeTrainingLoadTrend", () => {
  it("is unavailable with no daily loads", () => {
    expect(analyzeTrainingLoadTrend([]).value).toBeNull();
  });

  it("composes ctl/atl/tsb into one point per day", () => {
    const result = analyzeTrainingLoadTrend([{ date: "2026-01-01", load: 100 }]);
    expect(result.value).toHaveLength(1);
    const point = result.value![0];
    expect(point.date).toBe("2026-01-01");
    expect(point.ctl).toBeCloseTo(100 / 42, 5);
    expect(point.atl).toBeCloseTo(100 / 7, 5);
    expect(point.tsb).toBeCloseTo(point.ctl - point.atl, 5);
  });

  it("fills gaps so ctl and atl always cover the same dates", () => {
    const result = analyzeTrainingLoadTrend([
      { date: "2026-01-01", load: 100 },
      { date: "2026-01-05", load: 100 },
    ]);
    expect(result.value!.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]);
  });

  it("takes the minimum confidence of ctl and atl", () => {
    const result = analyzeTrainingLoadTrend([{ date: "2026-01-01", load: 100 }]);
    expect(result.confidence).toBeCloseTo(Math.min(1 / 42, 1 / 7), 5);
  });

  it("reports low overall quality if either ctl or atl is low", () => {
    const result = analyzeTrainingLoadTrend([{ date: "2026-01-01", load: 100 }]);
    expect(result.dataQuality).toBe("low");
  });

  it("reports high overall quality only once both ctl (42d) and atl (7d) reach high quality", () => {
    const dailyLoads = Array.from({ length: 42 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      load: 50,
    }));
    const result = analyzeTrainingLoadTrend(dailyLoads);
    expect(result.dataQuality).toBe("high");
  });
});

describe("latestTrainingLoadPoint", () => {
  it("is unavailable with no daily loads", () => {
    expect(latestTrainingLoadPoint([]).value).toBeNull();
  });

  it("returns the most recent point in the series", () => {
    const result = latestTrainingLoadPoint([
      { date: "2026-01-01", load: 100 },
      { date: "2026-01-02", load: 100 },
    ]);
    expect(result.value!.date).toBe("2026-01-02");
  });
});
