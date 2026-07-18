import type { Activity, MetricsSnapshot } from "../domain/types";
import { getSupabase } from "./supabaseClient";

// Row shapes as stored today in the existing `strava_activities` / `daily_pmc`
// tables (populated by the Strava sync edge function). Mapping them into the
// domain types here keeps the rest of the app decoupled from the storage schema.
interface StravaActivityRow {
  id: string | number;
  name: string;
  start_date: string;
  distance_m: number | null;
  moving_time_s: number | null;
  average_heartrate: number | null;
  average_watts: number | null;
  weighted_average_watts: number | null;
  rtss: number | null;
  best_efforts: Record<string, number> | null;
  zone_minutes: Activity["zoneMinutes"] | null;
}

interface DailyPmcRow {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export function mapActivityRow(row: StravaActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    distanceM: row.distance_m,
    movingTimeS: row.moving_time_s,
    averageHeartrate: row.average_heartrate,
    averageWatts: row.average_watts,
    weightedAverageWatts: row.weighted_average_watts,
    rtss: row.rtss,
    bestEfforts: row.best_efforts,
    zoneMinutes: row.zone_minutes,
  };
}

export function mapSnapshotRow(row: DailyPmcRow): MetricsSnapshot {
  return { date: row.date, ctl: row.ctl, atl: row.atl, tsb: row.tsb };
}

export async function fetchRecentActivities(limit = 200): Promise<Activity[]> {
  const { data, error } = await getSupabase()
    .from("strava_activities")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as StravaActivityRow[]).map(mapActivityRow);
}

export async function fetchMetricsHistory(): Promise<MetricsSnapshot[]> {
  const { data, error } = await getSupabase()
    .from("daily_pmc")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as DailyPmcRow[]).map(mapSnapshotRow);
}
