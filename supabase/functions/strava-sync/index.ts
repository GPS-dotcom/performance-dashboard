// Sync Engine -- the only component allowed to talk to a third-party API
// (per docs/ARCHITECTURE.md's platform architecture: "Sync Engine —
// imports/validates/normalizes external data"). Pulls the athlete's
// recent Strava activities, upserts them into `strava_activities`
// (migration 0013), then derives daily Training Load per session and
// recomputes the full CTL/ATL/TSB series into `daily_pmc`.
//
// The Training Load / CTL / ATL formulas below mirror
// treino-z2/src/metrics/calculators/trainingLoadCalculator.ts and
// shared/ewma.ts exactly (same formulas, same constants) -- inlined into
// this single file (rather than imported from a shared module) so this
// function can be deployed as one self-contained file from the Supabase
// Dashboard's Edge Function editor, with no local CLI/terminal required.
// If the Metrics Engine's formulas ever change, update both places -- see
// METRICS_ENGINE_REPORT.md for the citations behind these constants
// (Coggan's power-based TSS; Banister's CTL/ATL EWMA, tau=42/7 days).
//
// Invoke manually (curl/browser hit) or on a schedule (Supabase's Edge
// Function Schedules, or pg_cron calling this URL) -- see
// supabase/functions/README.md for both.
import { createClient } from "npm:@supabase/supabase-js@2";

const CTL_TAU_DAYS = 42;
const ATL_TAU_DAYS = 7;

interface DailyLoad {
  date: string; // YYYY-MM-DD
  load: number;
}

/** Same three-tier fallback as trainingLoadCalculator.ts: power-based TSS, then HR-based, then null (no RPE input exists from Strava). */
function computeSessionLoad(input: {
  durationSec: number;
  normalizedPowerWatts: number | null;
  ftpWatts: number | null;
  averageHeartRate: number | null;
  thresholdHeartRate: number | null;
}): number | null {
  if (!(input.durationSec > 0)) return null;

  if (input.normalizedPowerWatts && input.normalizedPowerWatts > 0 && input.ftpWatts && input.ftpWatts > 0) {
    const intensityFactor = input.normalizedPowerWatts / input.ftpWatts;
    return ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
  }

  if (input.averageHeartRate && input.averageHeartRate > 0 && input.thresholdHeartRate && input.thresholdHeartRate > 0) {
    const intensityFactor = input.averageHeartRate / input.thresholdHeartRate;
    return ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
  }

  return null;
}

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/** Same recurrence as shared/ewma.ts's exponentialMovingAverage: today = yesterday + (load - yesterday) / tauDays, gaps filled with load = 0. */
function exponentialMovingAverage(dailyLoads: DailyLoad[], tauDays: number): DailyLoad[] {
  if (dailyLoads.length === 0) return [];

  const sorted = [...dailyLoads].sort((a, b) => a.date.localeCompare(b.date));
  const startDay = toDayNumber(sorted[0].date);
  const endDay = toDayNumber(sorted[sorted.length - 1].date);

  const loadByDay = new Map<number, number>();
  for (const entry of sorted) {
    const day = toDayNumber(entry.date);
    loadByDay.set(day, (loadByDay.get(day) ?? 0) + entry.load);
  }

  let average = 0;
  const series: DailyLoad[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const load = loadByDay.get(day) ?? 0;
    average += (load - average) / tauDays;
    series.push({ date: fromDayNumber(day), load: average });
  }
  return series;
}

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Strava rate-limits at 200 requests/15min and 2000/day -- 5 pages of 100
// (this run's own budget) leaves headroom for the token refresh call and
// any other Edge Function invocations sharing the same app.
const MAX_PAGES = 5;
const PER_PAGE = 100;
const TOKEN_REFRESH_SKEW_SEC = 120;

interface StravaTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface StravaActivitySummary {
  id: number;
  name: string;
  start_date: string;
  distance: number | null;
  moving_time: number | null;
  average_heartrate: number | null;
  average_watts: number | null;
  weighted_average_watts: number | null;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function fetchAllActivities(accessToken: string): Promise<StravaActivitySummary[]> {
  const activities: StravaActivitySummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Strava activities fetch failed (${res.status}): ${await res.text()}`);
    const pageActivities = (await res.json()) as StravaActivitySummary[];
    activities.push(...pageActivities);
    if (pageActivities.length < PER_PAGE) break; // last page
  }
  return activities;
}

Deno.serve(async (_req: Request) => {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return jsonResponse(500, { error: "Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET secrets on this Edge Function." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: tokenRow, error: tokenError } = await supabase.from("strava_tokens").select("access_token,refresh_token,expires_at").eq("id", 1).maybeSingle();
  if (tokenError) return jsonResponse(500, { error: `Could not read strava_tokens: ${tokenError.message}` });
  if (!tokenRow) return jsonResponse(400, { error: "Not connected to Strava yet -- visit the OAuth authorize URL first (see supabase/functions/README.md)." });

  let { access_token: accessToken } = tokenRow as StravaTokenRow;
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenRow.expires_at <= nowSec + TOKEN_REFRESH_SKEW_SEC) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    accessToken = refreshed.access_token;
    const { error: updateError } = await supabase
      .from("strava_tokens")
      .update({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: refreshed.expires_at, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (updateError) return jsonResponse(500, { error: `Could not persist refreshed token: ${updateError.message}` });
  }

  const activities = await fetchAllActivities(accessToken);

  const activityRows = activities.map((a) => ({
    id: a.id,
    name: a.name,
    start_date: a.start_date,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    average_heartrate: a.average_heartrate,
    average_watts: a.average_watts,
    weighted_average_watts: a.weighted_average_watts,
    // rtss, best_efforts, zone_minutes: not populated by this sync yet --
    // they need, respectively, the athlete's FTP/threshold HR (rtss is
    // computed below into daily_pmc's load, not stored per-activity),
    // per-activity detail fetches (best_efforts), and per-second HR/power
    // streams (zone_minutes). Left null rather than fabricated -- see
    // supabase/functions/README.md's Limitations.
  }));

  if (activityRows.length > 0) {
    const { error: upsertError } = await supabase.from("strava_activities").upsert(activityRows);
    if (upsertError) return jsonResponse(500, { error: `Could not upsert strava_activities: ${upsertError.message}` });
  }

  // Athlete thresholds -- optional. Without them, Training Load can't be
  // computed for any session (see computeSessionLoad's fallback), and
  // every day's CTL/ATL/TSB comes out at exactly 0 -- not wrong, just
  // uninformative until FTP or threshold_heart_rate is set (migration 0014).
  const { data: athlete } = await supabase.from("athletes").select("ftp,threshold_heart_rate").limit(1).maybeSingle();
  const ftpWatts: number | null = athlete?.ftp ?? null;
  const thresholdHeartRate: number | null = athlete?.threshold_heart_rate ?? null;

  const dailyLoads: DailyLoad[] = [];
  const loadByDate = new Map<string, number>();
  for (const activity of activities) {
    const load = computeSessionLoad({
      durationSec: activity.moving_time ?? 0,
      normalizedPowerWatts: activity.weighted_average_watts,
      ftpWatts,
      averageHeartRate: activity.average_heartrate,
      thresholdHeartRate,
    });
    if (load == null) continue;
    const date = activity.start_date.slice(0, 10);
    loadByDate.set(date, (loadByDate.get(date) ?? 0) + load);
  }
  for (const [date, load] of loadByDate) dailyLoads.push({ date, load });

  let daysWritten = 0;
  if (dailyLoads.length > 0) {
    const ctlSeries = exponentialMovingAverage(dailyLoads, CTL_TAU_DAYS);
    const atlSeries = exponentialMovingAverage(dailyLoads, ATL_TAU_DAYS);
    const atlByDate = new Map(atlSeries.map((p) => [p.date, p.load]));

    const pmcRows = ctlSeries.map((ctlPoint) => {
      const atl = atlByDate.get(ctlPoint.date) ?? 0;
      return { date: ctlPoint.date, ctl: ctlPoint.load, atl, tsb: ctlPoint.load - atl };
    });

    const { error: pmcError } = await supabase.from("daily_pmc").upsert(pmcRows);
    if (pmcError) return jsonResponse(500, { error: `Could not upsert daily_pmc: ${pmcError.message}` });
    daysWritten = pmcRows.length;
  }

  return jsonResponse(200, {
    activitiesSynced: activityRows.length,
    daysWithComputedLoad: loadByDate.size,
    pmcDaysWritten: daysWritten,
    thresholdsUsed: { ftpWatts, thresholdHeartRate },
  });
});
