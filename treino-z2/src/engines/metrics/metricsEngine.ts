// Metrics Engine: pure calculations over raw activity/metrics data.
// Per Performance.MD: "It performs calculations only. It does not interpret,
// coach or make recommendations" — those belong to the (future) Intelligence Engine.

import type { Activity, MetricsSnapshot, ZoneDefinition, ZoneKey, ZoneMinutes } from "../../types";

export const DEFAULT_ZONES: ZoneDefinition[] = [
  { zone: "Z1", label: "Recovery", hrMax: 127, powerMax: 315, color: "#2a78d6" },
  { zone: "Z2", label: "Aeróbio", hrMax: 159, powerMax: 353, color: "#1baf7a" },
  { zone: "Z3", label: "Tempo", hrMax: 174, powerMax: 383, color: "#eda100" },
  { zone: "Z4", label: "Threshold", hrMax: 190, powerMax: 412, color: "#eb6834" },
  { zone: "Z5", label: "VO2max", hrMax: Infinity, powerMax: Infinity, color: "#e34948" },
];

const EMPTY_ZONE_MINUTES: ZoneMinutes = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };

export function classifyActivityZone(
  activity: Pick<Activity, "weightedAverageWatts" | "averageWatts" | "averageHeartrate">,
  zones: ZoneDefinition[] = DEFAULT_ZONES,
): ZoneKey | null {
  const watts = activity.weightedAverageWatts ?? activity.averageWatts;
  if (watts != null) {
    const match = zones.find((z) => watts <= z.powerMax);
    return (match ?? zones[zones.length - 1]).zone;
  }
  if (activity.averageHeartrate != null) {
    const match = zones.find((z) => activity.averageHeartrate! <= z.hrMax);
    return (match ?? zones[zones.length - 1]).zone;
  }
  return null;
}

/** Real per-second zone breakdown when available, else a single-zone estimate from averages. */
export function activityZoneMinutes(
  activity: Pick<
    Activity,
    "zoneMinutes" | "weightedAverageWatts" | "averageWatts" | "averageHeartrate" | "movingTimeS"
  >,
  zones: ZoneDefinition[] = DEFAULT_ZONES,
): ZoneMinutes {
  const real = activity.zoneMinutes;
  if (real && Object.values(real).some((v) => v > 0)) return real;

  const zone = classifyActivityZone(activity, zones);
  const out: ZoneMinutes = { ...EMPTY_ZONE_MINUTES };
  if (zone) out[zone] = (activity.movingTimeS ?? 0) / 60;
  return out;
}

export interface WeeklySummary {
  activityCount: number;
  distanceKm: number;
  movingTimeS: number;
  totalRtss: number;
  zoneMinutes: ZoneMinutes;
}

/** Summarizes activities within [startIso, endIso) (both ISO date strings, end exclusive). */
export function computeWeeklySummary(
  activities: Activity[],
  startIso: string,
  endIso: string,
  zones: ZoneDefinition[] = DEFAULT_ZONES,
): WeeklySummary {
  const inRange = activities.filter((a) => a.startDate >= startIso && a.startDate < endIso);

  const zoneMinutes = { ...EMPTY_ZONE_MINUTES };
  let distanceKm = 0;
  let movingTimeS = 0;
  let totalRtss = 0;

  for (const a of inRange) {
    distanceKm += (a.distanceM ?? 0) / 1000;
    movingTimeS += a.movingTimeS ?? 0;
    totalRtss += a.rtss ?? 0;
    const zm = activityZoneMinutes(a, zones);
    (Object.keys(zoneMinutes) as ZoneKey[]).forEach((k) => {
      zoneMinutes[k] += zm[k];
    });
  }

  return { activityCount: inRange.length, distanceKm, movingTimeS, totalRtss, zoneMinutes };
}

/** Most recent fitness/fatigue/form snapshot, or null if none exist. */
export function latestSnapshot(snapshots: MetricsSnapshot[]): MetricsSnapshot | null {
  if (snapshots.length === 0) return null;
  return snapshots.reduce((latest, s) => (s.date > latest.date ? s : latest), snapshots[0]);
}

export function paceMinPerKm(distanceM: number | null, movingTimeS: number | null): number | null {
  if (!distanceM || !movingTimeS) return null;
  return movingTimeS / 60 / (distanceM / 1000);
}
