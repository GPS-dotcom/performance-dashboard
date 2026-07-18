import type {
  NormalizedActivity,
  NormalizedLap,
  NormalizedRecord,
  RawStravaActivity,
  RawStravaLap,
  RawStravaStreams,
} from "./types";

// Unit conversion (m/s -> sec/km), not a physiological calculation: the
// provider's own speed value, expressed in our internal pace unit.
function paceSecPerKmFromSpeedMps(speedMps: number | null | undefined): number | null {
  if (!speedMps) return null;
  return 1000 / speedMps;
}

/**
 * Normalization (06_ACTIVITY_ENGINE.md): "Provider-specific fields are
 * converted into the internal domain model." E.g. average_heartrate ->
 * averageHeartRate, moving_time -> movingTime, total_elevation_gain ->
 * elevationGain.
 */
export function normalizeStravaActivity(raw: RawStravaActivity, athleteId: string): NormalizedActivity {
  return {
    provider: "strava",
    externalId: String(raw.id),
    athleteId,
    name: raw.name,
    description: raw.description ?? null,
    sportType: (raw.sport_type ?? raw.type) as string,
    startTime: raw.start_date,
    timezone: raw.timezone ?? null,
    movingTime: raw.moving_time ?? 0,
    elapsedTime: raw.elapsed_time ?? 0,
    distance: raw.distance ?? 0,
    averagePaceSecPerKm: paceSecPerKmFromSpeedMps(raw.average_speed),
    bestPaceSecPerKm: null, // filled in by importActivity() once laps are normalized, see bestPaceFromLaps()
    averagePower: raw.average_watts ?? null,
    maxPower: raw.max_watts ?? null,
    averageHeartRate: raw.average_heartrate ?? null,
    maxHeartRate: raw.max_heartrate ?? null,
    averageCadence: raw.average_cadence ?? null,
    maxCadence: raw.max_cadence ?? null,
    elevationGain: raw.total_elevation_gain ?? null,
    elevationLoss: null, // Strava's summary activity doesn't provide this
    elevationHighest: raw.elev_high ?? null,
    elevationLowest: raw.elev_low ?? null,
    shoe: raw.gear_id ?? null,
    mapPolyline: raw.map?.summary_polyline ?? null,
  };
}

export function normalizeStravaLaps(raw: RawStravaLap[]): NormalizedLap[] {
  return raw.map((lap) => ({
    lapNumber: lap.lap_index,
    distanceM: lap.distance ?? null,
    durationS: lap.moving_time ?? null,
    paceSecPerKm: paceSecPerKmFromSpeedMps(lap.average_speed),
    power: lap.average_watts ?? null,
    heartRate: lap.average_heartrate ?? null,
    cadence: lap.average_cadence ?? null,
    elevationM: lap.total_elevation_gain ?? null,
  }));
}

/** Fastest lap pace, picked directly from already-normalized laps -- not a calculation, a selection. */
export function bestPaceFromLaps(laps: NormalizedLap[]): number | null {
  const paces = laps.map((l) => l.paceSecPerKm).filter((p): p is number => p != null);
  return paces.length > 0 ? Math.min(...paces) : null;
}

/** Strava's streams endpoint returns parallel arrays; this zips them into one record per index. */
export function normalizeStravaStreams(streams: RawStravaStreams, startTime: string): NormalizedRecord[] {
  const length = streams.time?.length ?? streams.latlng?.length ?? streams.altitude?.length ?? 0;
  const startMs = new Date(startTime).getTime();
  const hasValidStart = !Number.isNaN(startMs);

  const records: NormalizedRecord[] = [];
  for (let i = 0; i < length; i++) {
    const offsetS = streams.time?.[i];
    records.push({
      sequenceIndex: i,
      recordedAt: offsetS != null && hasValidStart ? new Date(startMs + offsetS * 1000).toISOString() : null,
      latitude: streams.latlng?.[i]?.[0] ?? null,
      longitude: streams.latlng?.[i]?.[1] ?? null,
      altitudeM: streams.altitude?.[i] ?? null,
      speedMps: streams.velocity_smooth?.[i] ?? null,
      paceSecPerKm: paceSecPerKmFromSpeedMps(streams.velocity_smooth?.[i]),
      power: streams.watts?.[i] ?? null,
      heartRate: streams.heartrate?.[i] ?? null,
      cadence: streams.cadence?.[i] ?? null,
    });
  }
  return records;
}
