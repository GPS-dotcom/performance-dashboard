import { getSupabase } from "../../api/supabaseClient";
import { confidenceLevelFor } from "../rules/confidenceRules";
import type { Insight } from "../types/insight";

/**
 * Persists an Insight to the `insights` table (0001_treino_z2_core_schema.sql,
 * extended by 0010_intelligence_engine_insights.sql). Upserts on
 * (athlete_id, client_insight_id) so recalculating the same insight
 * (07_METRICS_ENGINE.md-style "Recalculation Rules": new activity,
 * updated metrics, ...) replaces it instead of duplicating a row.
 * `recommendation`/`relatedRecommendations` are never written: they're
 * always empty at the source (see Insight.relatedRecommendations).
 */
export async function saveInsight(athleteId: string, insight: Insight): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("insights")
    .upsert(
      {
        athlete_id: athleteId,
        client_insight_id: insight.id,
        title: insight.title,
        category: insight.category,
        priority: insight.priority,
        confidence: insight.confidence,
        severity: mapSeverity(insight.severity),
        explanation: insight.description,
        evidence: insight.evidence,
        source_metrics: insight.relatedMetrics,
      },
      { onConflict: "athlete_id,client_insight_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[IntelligenceEngine] failed to persist insight:", error, { athleteId, kind: insight.id });
    return null;
  }
  return data as { id: string };
}

/**
 * `insights.severity` (0001) only allows 'info'|'warning'|'critical' --
 * this engine's 4-level severity (19_INSIGHTS_LIBRARY.md: Information,
 * Positive, Warning, Critical) maps "positive" onto the closest existing
 * check-constraint value, "info", rather than widening the DB
 * constraint for a distinction the storage layer doesn't need to make
 * (the richer 4-level value is always available on the in-memory Insight
 * and in `evidence`/`title`, which do get stored).
 */
function mapSeverity(severity: Insight["severity"]): "info" | "warning" | "critical" {
  if (severity === "positive") return "info";
  if (severity === "information") return "info";
  return severity;
}

/** Reads back an athlete's most recent insights, most recent first. */
export async function fetchRecentInsights(athleteId: string, limit: number): Promise<Insight[]> {
  const { data, error } = await getSupabase()
    .from("insights")
    .select("client_insight_id,title,category,priority,confidence,severity,explanation,evidence,source_metrics,created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as StoredInsightRow[]).map(mapRowToInsight);
}

interface StoredInsightRow {
  client_insight_id: string | null;
  title: string | null;
  category: string | null;
  priority: number | null;
  confidence: number;
  severity: "info" | "warning" | "critical";
  explanation: string;
  evidence: string[] | null;
  source_metrics: string[] | null;
  created_at: string;
}

/**
 * `insights.severity` only ever stores 'info'|'warning'|'critical' (see
 * mapSeverity above) -- "positive" was collapsed into "info" on write, so
 * that specific distinction can't be recovered on read. Read back as
 * "information", the more conservative of the two original meanings;
 * documented as a known lossy round-trip in INTELLIGENCE_ENGINE_REPORT.md.
 */
function mapRowToInsight(row: StoredInsightRow): Insight {
  const confidence = row.confidence;
  return {
    id: row.client_insight_id ?? "",
    category: (row.category ?? "fitness") as Insight["category"],
    priority: (row.priority ?? 6) as Insight["priority"],
    title: row.title ?? "",
    description: row.explanation,
    evidence: row.evidence ?? [],
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    relatedMetrics: row.source_metrics ?? [],
    date: row.created_at.slice(0, 10),
    severity: row.severity === "info" ? "information" : row.severity,
    relatedRecommendations: [],
  };
}
