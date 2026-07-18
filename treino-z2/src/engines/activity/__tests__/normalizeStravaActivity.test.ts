import { describe, expect, it } from "vitest";
import {
  bestPaceFromLaps,
  normalizeStravaActivity,
  normalizeStravaLaps,
  normalizeStravaStreams,
} from "../normalizeStravaActivity";
import type { RawStravaActivity, RawStravaLap, RawStravaStreams } from "../types";

describe("normalizeStravaActivity", () => {
  it("maps provider snake_case fields to the internal camelCase model", () => {
    const raw: RawStravaActivity = {
      id: 999,
      name: "Longão",
      description: "Easy long run",
      type: "Run",
      start_date: "2026-07-10T08:00:00Z",
      timezone: "(GMT-03:00) America/Sao_Paulo",
      moving_time: 6000,
      elapsed_time: 6100,
      distance: 20000,
      average_speed: 3.33,
      average_heartrate: 150,
      max_heartrate: 172,
      average_watts: 300,
      max_watts: 340,
      average_cadence: 85,
      max_cadence: 92,
      total_elevation_gain: 120,
      elev_high: 800,
      elev_low: 700,
      gear_id: "g123",
      map: { summary_polyline: "abc123" },
    };

    const normalized = normalizeStravaActivity(raw, "athlete-1");

    expect(normalized).toMatchObject({
      provider: "strava",
      externalId: "999",
      athleteId: "athlete-1",
      name: "Longão",
      description: "Easy long run",
      sportType: "Run",
      startTime: "2026-07-10T08:00:00Z",
      timezone: "(GMT-03:00) America/Sao_Paulo",
      movingTime: 6000,
      elapsedTime: 6100,
      distance: 20000,
      averageHeartRate: 150,
      maxHeartRate: 172,
      averagePower: 300,
      maxPower: 340,
      averageCadence: 85,
      maxCadence: 92,
      elevationGain: 120,
      elevationHighest: 800,
      elevationLowest: 700,
      shoe: "g123",
      mapPolyline: "abc123",
    });
    // average_speed 3.33 m/s -> 1000/3.33 sec/km
    expect(normalized.averagePaceSecPerKm).toBeCloseTo(1000 / 3.33, 5);
  });

  it("prefers sport_type over type", () => {
    const raw: RawStravaActivity = {
      id: 1,
      name: "x",
      type: "Ride",
      sport_type: "Run",
      start_date: "2026-07-10T08:00:00Z",
      moving_time: 100,
    };
    expect(normalizeStravaActivity(raw, "athlete-1").sportType).toBe("Run");
  });

  it("defaults optional fields to null instead of undefined", () => {
    const raw: RawStravaActivity = {
      id: 1,
      name: "x",
      type: "Run",
      start_date: "2026-07-10T08:00:00Z",
      moving_time: 100,
    };
    const normalized = normalizeStravaActivity(raw, "athlete-1");
    expect(normalized.averageHeartRate).toBeNull();
    expect(normalized.shoe).toBeNull();
    expect(normalized.mapPolyline).toBeNull();
    expect(normalized.elevationLoss).toBeNull();
  });
});

describe("normalizeStravaLaps", () => {
  it("maps each lap and converts speed to pace", () => {
    const raw: RawStravaLap[] = [
      { lap_index: 1, distance: 5000, moving_time: 1500, average_speed: 3.33, average_heartrate: 148 },
      { lap_index: 2, distance: 5000, moving_time: 1400, average_speed: 3.57, average_heartrate: 155 },
    ];
    const laps = normalizeStravaLaps(raw);
    expect(laps).toHaveLength(2);
    expect(laps[0]).toMatchObject({ lapNumber: 1, distanceM: 5000, durationS: 1500, heartRate: 148 });
    expect(laps[1].paceSecPerKm).toBeCloseTo(1000 / 3.57, 5);
  });
});

describe("bestPaceFromLaps", () => {
  it("picks the fastest (lowest) lap pace", () => {
    const laps = normalizeStravaLaps([
      { lap_index: 1, average_speed: 3.0 },
      { lap_index: 2, average_speed: 4.0 }, // faster -> lower sec/km
      { lap_index: 3, average_speed: 3.5 },
    ]);
    expect(bestPaceFromLaps(laps)).toBeCloseTo(1000 / 4.0, 5);
  });

  it("returns null when no laps have a pace", () => {
    expect(bestPaceFromLaps([])).toBeNull();
  });
});

describe("normalizeStravaStreams", () => {
  it("zips parallel stream arrays into one record per index", () => {
    const streams: RawStravaStreams = {
      time: [0, 5, 10],
      latlng: [
        [-23.5, -46.6],
        [-23.501, -46.601],
        [-23.502, -46.602],
      ],
      altitude: [700, 701, 702],
      heartrate: [140, 142, 145],
      velocity_smooth: [3.0, 3.2, 3.1],
    };

    const records = normalizeStravaStreams(streams, "2026-07-10T08:00:00.000Z");

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      sequenceIndex: 0,
      recordedAt: "2026-07-10T08:00:00.000Z",
      latitude: -23.5,
      longitude: -46.6,
      altitudeM: 700,
      heartRate: 140,
    });
    expect(records[1].recordedAt).toBe("2026-07-10T08:00:05.000Z");
    expect(records[2].paceSecPerKm).toBeCloseTo(1000 / 3.1, 5);
  });

  it("returns an empty array when streams have no data", () => {
    expect(normalizeStravaStreams({}, "2026-07-10T08:00:00Z")).toEqual([]);
  });

  it("leaves recordedAt null when the start time can't be parsed", () => {
    const records = normalizeStravaStreams({ time: [0, 5] }, "not-a-date");
    expect(records[0].recordedAt).toBeNull();
    expect(records[1].recordedAt).toBeNull();
  });
});
