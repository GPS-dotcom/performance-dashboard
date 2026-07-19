import { getSupabase } from "../../api/supabaseClient";
import type { Recommendation, RecommendationPriority, RecommendationType } from "../types/recommendation";

/**
 * Persists a Recommendation to the `recommendations` table
 * (0008_coach_engine.sql, extended by
 * 0012_coach_engine_recommendations_alerts.sql). Upserts on
 * (athlete_id, client_recommendation_id) so recalculating the same
 * recommendation replaces it instead of duplicating a row -- the same
 * pattern as the Intelligence/Prediction Engines' repositories.
 *
 * The legacy `kind`/`recommendation`/`reason`/`confidence` columns
 * (NOT NULL since 0008) are populated from `type`/`title`/`reasoning`/
 * `confidence` for backward compatibility with any existing reader of
 * those columns; the full envelope lives in the columns 0012 added.
 */
export async function saveRecommendation(athleteId: string, recommendation: Recommendation): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("recommendations")
    .upsert(
      {
        athlete_id: athleteId,
        kind: recommendation.type,
        recommendation: recommendation.title,
        reason: recommendation.reasoning,
        evidence: recommendation.supportingMetrics,
        confidence: recommendation.confidence,
        type: recommendation.type,
        priority: recommendation.priority,
        title: recommendation.title,
        description: recommendation.description,
        reasoning: recommendation.reasoning,
        supporting_metrics: recommendation.supportingMetrics,
        supporting_insights: recommendation.supportingInsights,
        supporting_predictions: recommendation.supportingPredictions,
        client_recommendation_id: recommendation.id,
      },
      { onConflict: "athlete_id,client_recommendation_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[CoachEngine] failed to persist recommendation:", error, { athleteId, id: recommendation.id });
    return null;
  }
  return data as { id: string };
}

interface StoredRecommendationRow {
  client_recommendation_id: string | null;
  type: string | null;
  priority: number | null;
  title: string | null;
  description: string | null;
  reasoning: string | null;
  supporting_metrics: string[] | null;
  supporting_insights: string[] | null;
  supporting_predictions: string[] | null;
  confidence: number;
  created_at: string;
}

function mapRowToRecommendation(row: StoredRecommendationRow): Recommendation {
  return {
    id: row.client_recommendation_id ?? "",
    type: (row.type ?? "intensity") as RecommendationType,
    priority: (row.priority ?? 3) as RecommendationPriority,
    title: row.title ?? "",
    description: row.description ?? "",
    reasoning: row.reasoning ?? "",
    supportingMetrics: row.supporting_metrics ?? [],
    supportingInsights: row.supporting_insights ?? [],
    supportingPredictions: row.supporting_predictions ?? [],
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

/** Reads back an athlete's most recent recommendations, most recent first. */
export async function fetchRecentRecommendations(athleteId: string, limit: number): Promise<Recommendation[]> {
  const { data, error } = await getSupabase()
    .from("recommendations")
    .select("client_recommendation_id,type,priority,title,description,reasoning,supporting_metrics,supporting_insights,supporting_predictions,confidence,created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as StoredRecommendationRow[]).map(mapRowToRecommendation);
}
