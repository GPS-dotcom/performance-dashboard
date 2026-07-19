import { describe, expect, it } from "vitest";
import { goalProbabilityModel, predictGoalAchievement } from "../../algorithms/goalProbabilityModel";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

// A perfectly linear, -10/day race-time history: 2026-06-01 (1300s) .. 2026-06-06 (1250s).
const decreasingRaceTimeHistory = series([1300, 1290, 1280, 1270, 1260, 1250]);

describe("predictGoalAchievement", () => {
  it("returns an unavailable output with fewer than 4 history points", () => {
    const output = predictGoalAchievement({
      valueHistory: series([1300, 1290]),
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-07-01",
      today: "2026-06-06",
    });
    expect(output.value).toBeNull();
  });

  it("reports exactly 50% probability when the trend lands exactly on the target on the target date", () => {
    // Trend continues at -10/day; from day5 (1250) it reaches 1200 exactly 5 days later, i.e. 2026-06-11.
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-06-11",
      today: "2026-06-08",
    });
    expect(output.value!.probability).toBeCloseTo(0.5, 5);
    expect(output.value!.estimatedAchievementDate).toBe("2026-06-11");
    expect(output.value!.limitingFactors).toEqual([]);
  });

  it("reports > 50% probability when the trend comfortably beats the target by the target date", () => {
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1230, // trend reaches ~1220 by the target date -- easily beats a 1230s goal
      polarity: "lower_is_better",
      targetDate: "2026-06-09",
      today: "2026-06-07",
    });
    expect(output.value!.probability).toBeGreaterThan(0.5);
  });

  it("reports < 50% probability when the trend falls short of an ambitious target", () => {
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1150, // far more ambitious than the ~1220 the trend actually reaches
      polarity: "lower_is_better",
      targetDate: "2026-06-09",
      today: "2026-06-07",
    });
    expect(output.value!.probability).toBeLessThan(0.5);
  });

  it("flags a trend moving away from the goal, and returns no estimated achievement date", () => {
    const worseningPace = series([1200, 1210, 1220, 1230, 1240, 1250]); // getting slower, but goal needs it lower
    const output = predictGoalAchievement({
      valueHistory: worseningPace,
      targetValue: 1100,
      polarity: "lower_is_better",
      targetDate: "2026-07-01",
      today: "2026-06-07",
    });
    expect(output.value!.estimatedAchievementDate).toBeNull();
    expect(output.value!.limitingFactors).toContain("current trend is not moving toward the goal -- at this rate the target is never reached");
  });

  it("flags a target date that has already passed", () => {
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-06-01",
      today: "2026-06-08",
    });
    expect(output.value!.limitingFactors).toContain("target date has already passed");
  });

  it("flags a target date far beyond the available history's timespan", () => {
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory, // 5-day span
      targetValue: 1000,
      polarity: "lower_is_better",
      targetDate: "2027-01-01", // far beyond
      today: "2026-06-08",
    });
    expect(output.value!.limitingFactors).toContain("target date is far beyond the available history's timespan -- limited basis to project this far ahead");
  });

  it("flags an inconsistent (low fit quality) trend", () => {
    const noisy = series([1300, 1100, 1350, 1050, 1400, 1000]);
    const output = predictGoalAchievement({
      valueHistory: noisy,
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-06-20",
      today: "2026-06-08",
    });
    expect(output.value!.limitingFactors.some((f) => f.includes("inconsistent"))).toBe(true);
  });

  it("supports higher_is_better goals (e.g. an FTP target)", () => {
    const risingFtp = series([200, 205, 210, 215, 220, 225]); // +5/day
    const output = predictGoalAchievement({
      valueHistory: risingFtp,
      targetValue: 250,
      polarity: "higher_is_better",
      targetDate: "2026-06-11", // 5 days after the last data point at +5/day -> reaches 250 exactly
      today: "2026-06-08",
    });
    expect(output.value!.probability).toBeCloseTo(0.5, 5);
    expect(output.value!.estimatedAchievementDate).toBe("2026-06-11");
  });

  it("always assumes the current trend continues unchanged", () => {
    const output = predictGoalAchievement({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-06-11",
      today: "2026-06-08",
    });
    expect(output.assumptions).toEqual(["assumes the current linear trend in the goal-relevant metric continues unchanged through the target date"]);
  });
});

describe("goalProbabilityModel", () => {
  it("exposes a stable modelId and delegates to predictGoalAchievement", () => {
    expect(goalProbabilityModel.modelId).toBe("linear-trend-goal-probability");
    const output = goalProbabilityModel.predict({
      valueHistory: decreasingRaceTimeHistory,
      targetValue: 1200,
      polarity: "lower_is_better",
      targetDate: "2026-06-11",
      today: "2026-06-08",
    });
    expect(output.value).not.toBeNull();
  });
});
