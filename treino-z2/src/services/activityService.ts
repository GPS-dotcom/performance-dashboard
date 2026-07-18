import type { Activity, MetricsSnapshot } from "../types";
import { getSupabase } from "../api/supabaseClient";

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

// Keep these in sync with the fields mapActivityRow/mapSnapshotRow actually
// read -- `select("*")` was pulling every column `strava_activities` has.
// Its schema is unversioned (PROJECT_AUDIT.md), so the full column list
// isn't known here, but the sync edge function that populates it derives
// these rows from Strava's per-second streams (PROJECT_AUDIT.md), which
// makes it plausible the table carries columns well beyond the 11 this
// app actually maps -- explicit selection avoids paying for whatever
// those turn out to be.
const STRAVA_ACTIVITY_COLUMNS =
  "id,name,start_date,distance_m,moving_time_s,average_heartrate,average_watts,weighted_average_watts,rtss,best_efforts,zone_minutes";
const DAILY_PMC_COLUMNS = "date,ctl,atl,tsb";

// `daily_pmc` grows by one row per athlete per day forever; without a
// bound this query -- and the payload it returns -- grow linearly with
// account age. 400 days comfortably covers a full annual periodization
// cycle (base/build/peak/taper/off-season), which is what
// calculateFitnessScore's CTL min-max normalization is documented to
// want ("the athlete's own recent CTL range") -- well beyond the 14 days
// where its confidence score already saturates, and far beyond the
// largest window any Intelligence Engine calculation here looks at
// (detectTrend's confidence saturates at 14 points; detectPlateau only
// ever looks at the most recent 6).
const METRICS_HISTORY_WINDOW_DAYS = 400;

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
    .select(STRAVA_ACTIVITY_COLUMNS)
    .order("start_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as StravaActivityRow[]).map(mapActivityRow);
}

export async function fetchMetricsHistory(windowDays = METRICS_HISTORY_WINDOW_DAYS): Promise<MetricsSnapshot[]> {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  // Sorted ascending (oldest first) so a plain `.limit()` here would return
  // the *oldest* rows in the account, not the most recent ones -- a date
  // cutoff is the correct way to bound this query, not a row limit.
  const { data, error } = await getSupabase()
    .from("daily_pmc")
    .select(DAILY_PMC_COLUMNS)
    .gte("date", cutoff)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as DailyPmcRow[]).map(mapSnapshotRow);
}
