// Activity Engine types, per 06_ACTIVITY_ENGINE.md.
//
// Two families of types here:
//   - Raw*: the shape of data as Strava's public API returns it
//     (snake_case, provider-specific field names) -- the doc's own
//     normalization example ("Provider average_heartrate -> internal
//     averageHeartRate") is written using exactly these Strava field
//     names, confirming Strava is the reference provider.
//   - Normalized*: the internal, camelCase, provider-agnostic domain
//     model every other engine is meant to consume.
//
// Nothing here is a physiological metric (no TSS, CTL/ATL/TSB, zones,
// VO2max, etc.) -- those stay out of scope per
// "The Activity Engine does not perform physiological calculations."

export interface RawStravaActivity {
  id: number | string;
  name: string;
  description?: string | null;
  type?: string;
  sport_type?: string;
  start_date: string;
  timezone?: string | null;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  average_speed?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_watts?: number | null;
  max_watts?: number | null;
  average_cadence?: number | null;
  max_cadence?: number | null;
  total_elevation_gain?: number | null;
  elev_high?: number | null;
  elev_low?: number | null;
  gear_id?: string | null;
  map?: { summary_polyline?: string | null } | null;
}

export interface RawStravaLap {
  lap_index: number;
  distance?: number | null;
  moving_time?: number | null;
  average_speed?: number | null;
  average_watts?: number | null;
  average_heartrate?: number | null;
  average_cadence?: number | null;
  total_elevation_gain?: number | null;
}

/** Strava's streams API: parallel arrays, one entry per recorded point. */
export interface RawStravaStreams {
  time?: number[]; // seconds since activity start
  latlng?: [number, number][];
  altitude?: number[];
  velocity_smooth?: number[];
  heartrate?: number[];
  cadence?: number[];
  watts?: number[];
}

export type ActivityStatus = "imported" | "validated" | "processed" | "archived" | "failed";

export type ActivityEventType =
  | "activity_created"
  | "activity_updated"
  | "activity_archived"
  | "activity_deleted"
  | "activity_validation_failed";

export interface NormalizedActivity {
  provider: "strava";
  externalId: string;
  athleteId: string;
  name: string;
  description: string | null;
  sportType: string;
  startTime: string;
  timezone: string | null;
  movingTime: number;
  elapsedTime: number;
  distance: number;
  averagePaceSecPerKm: number | null;
  bestPaceSecPerKm: number | null;
  averagePower: number | null;
  maxPower: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averageCadence: number | null;
  maxCadence: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  elevationHighest: number | null;
  elevationLowest: number | null;
  shoe: string | null;
  mapPolyline: string | null;
}

export interface NormalizedLap {
  lapNumber: number;
  distanceM: number | null;
  durationS: number | null;
  paceSecPerKm: number | null;
  power: number | null;
  heartRate: number | null;
  cadence: number | null;
  elevationM: number | null;
}

export interface NormalizedRecord {
  sequenceIndex: number;
  recordedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  paceSecPerKm: number | null;
  power: number | null;
  heartRate: number | null;
  cadence: number | null;
}

export type ActivityEngineResult =
  | { outcome: "created"; activityId: string }
  | { outcome: "updated"; activityId: string }
  | { outcome: "failed"; activityId: string; errors: string[] }
  | { outcome: "rejected"; errors: string[] };
