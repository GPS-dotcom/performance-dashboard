import { describe, expect, it } from "vitest";
import {
  activityZoneMinutes,
  classifyActivityZone,
  computeWeeklySummary,
  latestSnapshot,
  paceMinPerKm,
} from "../metricsEngine";
import type { Activity, MetricsSnapshot } from "../../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "1",
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

describe("classifyActivityZone", () => {
  it("classifies by power when available", () => {
    expect(classifyActivityZone({ weightedAverageWatts: 340, averageWatts: null, averageHeartrate: null })).toBe(
      "Z2",
    );
  });

  it("falls back to heart rate when no power", () => {
    expect(classifyActivityZone({ weightedAverageWatts: null, averageWatts: null, averageHeartrate: 165 })).toBe(
      "Z3",
    );
  });

  it("returns null when no power or heart rate", () => {
    expect(classifyActivityZone({ weightedAverageWatts: null, averageWatts: null, averageHeartrate: null })).toBeNull();
  });

  it("caps at the top zone above the highest threshold", () => {
    expect(classifyActivityZone({ weightedAverageWatts: 999, averageWatts: null, averageHeartrate: null })).toBe(
      "Z5",
    );
  });
});

describe("activityZoneMinutes", () => {
  it("prefers real per-second zone data when present", () => {
    const real = { Z1: 1, Z2: 2, Z3: 0, Z4: 0, Z5: 0 };
    const result = activityZoneMinutes({
      zoneMinutes: real,
      weightedAverageWatts: null,
      averageWatts: null,
      averageHeartrate: null,
      movingTimeS: 600,
    });
    expect(result).toEqual(real);
  });

  it("estimates a single zone from averages when no real breakdown exists", () => {
    const result = activityZoneMinutes({
      zoneMinutes: null,
      weightedAverageWatts: null,
      averageWatts: null,
      averageHeartrate: 165,
      movingTimeS: 1800,
    });
    expect(result.Z3).toBe(30);
    expect(result.Z1 + result.Z2 + result.Z4 + result.Z5).toBe(0);
  });
});

describe("computeWeeklySummary", () => {
  it("sums distance, time and rTSS only for activities within range", () => {
    const activities = [
      makeActivity({ startDate: "2026-07-06", distanceM: 5000, movingTimeS: 1500, rtss: 40 }),
      makeActivity({ startDate: "2026-07-10", distanceM: 10000, movingTimeS: 3000, rtss: 80 }),
      makeActivity({ startDate: "2026-07-13", distanceM: 8000, movingTimeS: 2400, rtss: 60 }), // outside range
    ];
    const summary = computeWeeklySummary(activities, "2026-07-06", "2026-07-13");
    expect(summary.activityCount).toBe(2);
    expect(summary.distanceKm).toBe(15);
    expect(summary.movingTimeS).toBe(4500);
    expect(summary.totalRtss).toBe(120);
  });

  it("returns a zeroed summary for an empty range", () => {
    const summary = computeWeeklySummary([], "2026-07-06", "2026-07-13");
    expect(summary).toEqual({
      activityCount: 0,
      distanceKm: 0,
      movingTimeS: 0,
      totalRtss: 0,
      zoneMinutes: { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 },
    });
  });
});

describe("latestSnapshot", () => {
  it("returns the snapshot with the most recent date", () => {
    const snapshots: MetricsSnapshot[] = [
      { date: "2026-07-01", ctl: 50, atl: 40, tsb: 10 },
      { date: "2026-07-10", ctl: 55, atl: 60, tsb: -5 },
      { date: "2026-07-05", ctl: 52, atl: 45, tsb: 7 },
    ];
    expect(latestSnapshot(snapshots)).toEqual(snapshots[1]);
  });

  it("returns null for an empty list", () => {
    expect(latestSnapshot([])).toBeNull();
  });
});

describe("paceMinPerKm", () => {
  it("computes minutes per km", () => {
    expect(paceMinPerKm(10000, 3000)).toBe(5);
  });

  it("returns null when distance or time is missing", () => {
    expect(paceMinPerKm(null, 3000)).toBeNull();
    expect(paceMinPerKm(10000, null)).toBeNull();
    expect(paceMinPerKm(0, 3000)).toBeNull();
  });
});
