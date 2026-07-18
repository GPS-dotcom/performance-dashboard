import { getSupabase } from "../../api/supabaseClient";
import type { Insight } from "./types";

/**
 * Persists an Insight to the `insights` table (see 0001_treino_z2_core_schema.sql).
 * The only impure function in this engine -- everything else here is a
 * pure function over MetricSeriesPoint[]. `recommendation` is always null
 * on the way in, since generating one is the Coach Engine's job, not this
 * engine's.
 */
export async function saveInsight(athleteId: string, insight: Insight): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("insights")
    .insert({
      athlete_id: athleteId,
      confidence: insight.confidence,
      severity: insight.severity,
      explanation: insight.explanation,
      source_metrics: insight.sourceMetrics,
      recommendation: insight.recommendation,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[IntelligenceEngine] failed to persist insight:", error, { athleteId, kind: insight.kind });
    return null;
  }
  return data as { id: string };
}
