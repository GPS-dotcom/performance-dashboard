import { describe, expect, it } from "vitest";
import { assembleMetricsView } from "../../hooks/assembleMetricsView";
import type { Activity, MetricsSnapshot } from "../../../types";
import type { AthleteProfile } from "../../services/athleteProfileService";

const today = "2026-07-19"; // Sunday

function makeAthlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    id: "a1",
    birthday: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    ftp: null,
    vo2max: null,
    maxHr: null,
    restingHr: null,
    thresholdPaceSecPerKm: null,
    thresholdPower: null,
    preferredUnits: "metric",
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Morning Run",
    startDate: "2026-07-14T08:00:00Z",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: 150,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: 80,
    bestEfforts: null,
    zoneMinutes: { Z1: 5, Z2: 30, Z3: 10, Z4: 3, Z5: 1 },
    ...overrides,
  };
}

describe("assembleMetricsView", () => {
  it("passes metrics history through as CTL/ATL/TSB series", () => {
    const history: MetricsSnapshot[] = [
      { date: "2026-07-17", ctl: 48, atl: 55, tsb: -7 },
      { date: "2026-07-18", ctl: 49, atl: 53, tsb: -4 },
    ];
    const result = assembleMetricsView([], history, null, today);
    expect(result.dates).toEqual(["2026-07-17", "2026-07-18"]);
    expect(result.ctlValues).toEqual([48, 49]);
    expect(result.atlValues).toEqual([55, 53]);
    expect(result.tsbValues).toEqual([-7, -4]);
    expect(result.latest).toEqual(history[1]);
  });

  it("returns latest: null when there's no metrics history", () => {
    const result = assembleMetricsView([], [], null, today);
    expect(result.latest).toBeNull();
  });

  it("scopes this week's totals to the current ISO week only", () => {
    const activities: Activity[] = [
      makeActivity({ id: "in-week", startDate: "2026-07-14T08:00:00Z", distanceM: 10000 }), // Tuesday of the week containing 2026-07-19
      makeActivity({ id: "before-week", startDate: "2026-07-01T08:00:00Z", distanceM: 5000 }),
    ];
    const result = assembleMetricsView(activities, [], null, today);
    expect(result.thisWeek.activityCount).toBe(1);
    expect(result.thisWeek.distanceKm).toBeCloseTo(10);
  });

  it("sums zone minutes across every activity", () => {
    const activities = [makeActivity({ zoneMinutes: { Z1: 1, Z2: 2, Z3: 3, Z4: 4, Z5: 5 } }), makeActivity({ zoneMinutes: { Z1: 1, Z2: 1, Z3: 1, Z4: 1, Z5: 1 } })];
    const result = assembleMetricsView(activities, [], null, today);
    expect(result.zoneMinutesTotals).toEqual({ Z1: 2, Z2: 3, Z3: 4, Z4: 5, Z5: 6 });
  });

  it("treats a missing zoneMinutes as zero contribution", () => {
    const activities = [makeActivity({ zoneMinutes: null })];
    const result = assembleMetricsView(activities, [], null, today);
    expect(result.zoneMinutesTotals).toEqual({ Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 });
  });

  it("scopes this week's totals correctly when today is a weekday, not just on a Sunday", () => {
    // 2026-07-15 is a Wednesday; its ISO week is still 2026-07-13..2026-07-19.
    const activities: Activity[] = [makeActivity({ id: "in-week", startDate: "2026-07-14T08:00:00Z", distanceM: 10000 })];
    const result = assembleMetricsView(activities, [], null, "2026-07-15");
    expect(result.thisWeek.activityCount).toBe(1);
  });

  it("computes power zones only when the athlete has an FTP", () => {
    expect(assembleMetricsView([], [], null, today).powerZones).toBeNull();
    expect(assembleMetricsView([], [], makeAthlete({ ftp: 250 }), today).powerZones).not.toBeNull();
  });

  it("computes pace zones only when the athlete has a threshold pace", () => {
    expect(assembleMetricsView([], [], makeAthlete(), today).paceZones).toBeNull();
    expect(assembleMetricsView([], [], makeAthlete({ thresholdPaceSecPerKm: 240 }), today).paceZones).not.toBeNull();
  });
});
