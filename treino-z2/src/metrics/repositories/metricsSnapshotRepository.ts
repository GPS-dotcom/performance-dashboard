import { getSupabase } from "../../api/supabaseClient";
import type { TrainingLoadPoint } from "../analyzers/trainingLoadTrendAnalyzer";

interface MetricsSnapshotRow {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

function mapRow(row: MetricsSnapshotRow): TrainingLoadPoint {
  return { date: row.date, ctl: row.ctl, atl: row.atl, tsb: row.tsb };
}

/** Reads CTL/ATL/TSB history from `metrics_snapshots` (migration 0001), most recent last. */
export async function fetchMetricsSnapshotHistory(athleteId: string, windowDays: number): Promise<TrainingLoadPoint[]> {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const { data, error } = await getSupabase()
    .from("metrics_snapshots")
    .select("date,ctl,atl,tsb")
    .eq("athlete_id", athleteId)
    .gte("date", cutoff)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data as MetricsSnapshotRow[]).map(mapRow);
}

/**
 * Persists one day's CTL/ATL/TSB, overwriting any existing row for that
 * athlete+date -- `metrics_snapshots` has a `unique (athlete_id, date)`
 * constraint precisely so a recalculation (07_METRICS_ENGINE.md's
 * "Recalculation Rules": workout imported/edited, threshold updated, ...)
 * replaces the prior value for that day instead of duplicating it.
 */
export async function upsertMetricsSnapshot(athleteId: string, point: TrainingLoadPoint): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("metrics_snapshots")
    .upsert(
      { athlete_id: athleteId, date: point.date, ctl: point.ctl, atl: point.atl, tsb: point.tsb },
      { onConflict: "athlete_id,date" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[MetricsEngine] failed to persist metrics snapshot:", error, { athleteId, date: point.date });
    return null;
  }
  return data as { id: string };
}
