import { describe, expect, it } from "vitest";
import { mapActivityRow, mapSnapshotRow } from "../activityRepository";

describe("mapActivityRow", () => {
  it("maps snake_case storage columns to domain field names", () => {
    const row = {
      id: 42,
      name: "Longão",
      start_date: "2026-07-10",
      distance_m: 30000,
      moving_time_s: 9000,
      average_heartrate: 150,
      average_watts: 300,
      weighted_average_watts: 310,
      rtss: 120,
      best_efforts: { "5k": 1200 },
      zone_minutes: { Z1: 10, Z2: 80, Z3: 0, Z4: 0, Z5: 0 },
    };
    expect(mapActivityRow(row)).toEqual({
      id: 42,
      name: "Longão",
      startDate: "2026-07-10",
      distanceM: 30000,
      movingTimeS: 9000,
      averageHeartrate: 150,
      averageWatts: 300,
      weightedAverageWatts: 310,
      rtss: 120,
      bestEfforts: { "5k": 1200 },
      zoneMinutes: { Z1: 10, Z2: 80, Z3: 0, Z4: 0, Z5: 0 },
    });
  });
});

describe("mapSnapshotRow", () => {
  it("maps a daily_pmc row to a MetricsSnapshot", () => {
    const row = { date: "2026-07-10", ctl: 55.2, atl: 60.1, tsb: -4.9 };
    expect(mapSnapshotRow(row)).toEqual(row);
  });
});
