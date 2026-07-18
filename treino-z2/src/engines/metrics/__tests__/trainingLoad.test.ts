import { describe, expect, it } from "vitest";
import { ATL_TIME_CONSTANT_DAYS, CTL_TIME_CONSTANT_DAYS, calculateTrainingLoadSeries, latestTrainingLoad } from "../trainingLoad";

describe("calculateTrainingLoadSeries", () => {
  it("matches the hand-computed Banister exponential average for 3 constant-load days", () => {
    const series = calculateTrainingLoadSeries([
      { date: "2026-07-01", tss: 100 },
      { date: "2026-07-02", tss: 100 },
      { date: "2026-07-03", tss: 100 },
    ]);

    expect(series.value).toHaveLength(3);
    // ctl: 0 -> 2.380952 -> 4.705215 -> 6.974139 (each step: ctl += (100-ctl)/42)
    expect(series.value![2].ctl).toBeCloseTo(6.974139, 5);
    // atl: 0 -> 14.285714 -> 26.530612 -> 37.026239 (each step: atl += (100-atl)/7)
    expect(series.value![2].atl).toBeCloseTo(37.026239, 5);
    expect(series.value![2].tsb).toBeCloseTo(6.974139 - 37.026239, 5);
  });

  it("fills gap days with tss = 0, letting CTL/ATL decay on rest days", () => {
    const series = calculateTrainingLoadSeries([
      { date: "2026-07-01", tss: 100 },
      { date: "2026-07-03", tss: 100 }, // 2026-07-02 has no entry
    ]);
    expect(series.value).toHaveLength(3);
    expect(series.value![1].date).toBe("2026-07-02");
    // On the gap day, tss=0, so atl should have decayed toward 0 from day 1's value.
    expect(series.value![1].atl).toBeLessThan(series.value![0].atl);
  });

  it("sums same-day entries before applying the exponential step", () => {
    const series = calculateTrainingLoadSeries([
      { date: "2026-07-01", tss: 40 },
      { date: "2026-07-01", tss: 60 },
    ]);
    expect(series.value).toHaveLength(1);
    expect(series.value![0].atl).toBeCloseTo(100 / ATL_TIME_CONSTANT_DAYS, 6);
  });

  it("is unavailable with no data", () => {
    const series = calculateTrainingLoadSeries([]);
    expect(series.value).toBeNull();
    expect(series.missingInputs).toContain("no daily load data");
  });

  it("flags low data quality for a short history and high once it reaches the CTL time constant", () => {
    const short = calculateTrainingLoadSeries([{ date: "2026-07-01", tss: 50 }]);
    expect(short.dataQuality).toBe("low");

    const long = Array.from({ length: CTL_TIME_CONSTANT_DAYS }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
      tss: 50,
    }));
    expect(calculateTrainingLoadSeries(long).dataQuality).toBe("high");
  });
});

describe("latestTrainingLoad", () => {
  it("returns the most recent point of the series", () => {
    const result = latestTrainingLoad([
      { date: "2026-07-01", tss: 100 },
      { date: "2026-07-02", tss: 100 },
    ]);
    expect(result.value?.date).toBe("2026-07-02");
  });

  it("is unavailable with no data", () => {
    expect(latestTrainingLoad([]).value).toBeNull();
  });
});
