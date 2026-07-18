import { describe, expect, it } from "vitest";
import { analyzeWeeklyLoad } from "../weeklyLoadAnalyzer";
import type { Activity } from "../../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Run",
    startDate: "2026-07-10",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: 80,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

describe("analyzeWeeklyLoad", () => {
  it("sums distance, moving time and rtss for activities within range", () => {
    const activities = [
      makeActivity({ startDate: "2026-07-10", distanceM: 10000, movingTimeS: 3000, rtss: 80 }),
      makeActivity({ startDate: "2026-07-12", distanceM: 5000, movingTimeS: 1500, rtss: 40 }),
    ];
    const result = analyzeWeeklyLoad(activities, "2026-07-06", "2026-07-13");
    expect(result.activityCount).toBe(2);
    expect(result.distanceKm).toBeCloseTo(15, 5);
    expect(result.movingTimeS).toBe(4500);
    expect(result.totalExternalRtss).toBe(120);
  });

  it("excludes activities outside the [start, end) range", () => {
    const activities = [makeActivity({ startDate: "2026-07-13" })]; // exactly at end -- excluded
    const result = analyzeWeeklyLoad(activities, "2026-07-06", "2026-07-13");
    expect(result.activityCount).toBe(0);
  });

  it("treats null distance/time/rtss as 0 instead of throwing", () => {
    const activities = [makeActivity({ distanceM: null, movingTimeS: null, rtss: null })];
    const result = analyzeWeeklyLoad(activities, "2026-07-06", "2026-07-13");
    expect(result.distanceKm).toBe(0);
    expect(result.movingTimeS).toBe(0);
    expect(result.totalExternalRtss).toBe(0);
  });

  it("returns all-zero totals for an empty activity list", () => {
    const result = analyzeWeeklyLoad([], "2026-07-06", "2026-07-13");
    expect(result).toEqual({ activityCount: 0, distanceKm: 0, movingTimeS: 0, totalExternalRtss: 0 });
  });
});
