import { getSupabase } from "../../api/supabaseClient";
import type { Prediction, PredictionCategory, PredictionType } from "../types/prediction";

/**
 * Persists a Prediction to the `predictions` table
 * (0002_treino_z2_extended_entities.sql, extended by
 * 0007_prediction_engine.sql and 0011_prediction_engine_predictions.sql).
 * Upserts on (athlete_id, client_prediction_id) so recalculating the same
 * prediction (a new Daily Brief load, a refreshed forecast after new
 * activity data) replaces it instead of duplicating a row -- same
 * pattern as the Intelligence Engine's insightRepository.
 *
 * `kind` (legacy column, still not-null) is populated from
 * `predictionType` for backward compatibility with any existing reader
 * of that column; `category`/`predictionType` and the rest of the
 * envelope live in the columns 0011 added. The full structured `value`
 * is written to `value_json` (not every prediction's value is a bare
 * number); `predicted_value`/`unit` are populated only when `value` has
 * an obvious primary numeric field, for any legacy numeric-only reader.
 */
export async function savePrediction(athleteId: string, prediction: Prediction<unknown>): Promise<{ id: string } | null> {
  const { predictedValue, unit } = extractPrimaryNumericValue(prediction);

  const { data, error } = await getSupabase()
    .from("predictions")
    .upsert(
      {
        athlete_id: athleteId,
        kind: prediction.predictionType,
        category: prediction.category,
        target_distance_km: null,
        predicted_value: predictedValue,
        unit,
        confidence: prediction.confidence,
        lower_bound: prediction.lowerBound,
        upper_bound: prediction.upperBound,
        assumptions: prediction.assumptions,
        supporting_insights: prediction.supportingInsights,
        value_json: prediction.value,
        source_metrics: prediction.supportingMetrics,
        expires_at: prediction.expiresAt,
        client_prediction_id: prediction.id,
      },
      { onConflict: "athlete_id,client_prediction_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[PredictionEngine] failed to persist prediction:", error, { athleteId, id: prediction.id });
    return null;
  }
  return data as { id: string };
}

/**
 * `predicted_value`/`unit` are a legacy, numeric-only convenience for
 * readers that don't need the full structured value -- populated only
 * when `value` is itself a bare number (e.g. a future simpler
 * prediction), or left null for the richer object-shaped values this
 * engine actually produces (race/trend/risk/readiness/goal predictions
 * all carry more than one number, so `value_json` is their real,
 * lossless representation).
 */
function extractPrimaryNumericValue(prediction: Prediction<unknown>): { predictedValue: number | null; unit: string | null } {
  if (typeof prediction.value === "number") {
    return { predictedValue: prediction.value, unit: null };
  }
  return { predictedValue: null, unit: null };
}

interface StoredPredictionRow {
  client_prediction_id: string | null;
  kind: string;
  category: string | null;
  confidence: number;
  lower_bound: number | null;
  upper_bound: number | null;
  assumptions: string[] | null;
  supporting_insights: string[] | null;
  value_json: unknown;
  source_metrics: string[] | null;
  expires_at: string | null;
  created_at: string;
}

function mapRowToPrediction(row: StoredPredictionRow): Prediction<unknown> {
  return {
    id: row.client_prediction_id ?? "",
    predictionType: row.kind as PredictionType,
    category: (row.category ?? "fitness") as PredictionCategory,
    value: row.value_json ?? null,
    confidence: row.confidence,
    lowerBound: row.lower_bound,
    upperBound: row.upper_bound,
    supportingMetrics: row.source_metrics ?? [],
    supportingInsights: row.supporting_insights ?? [],
    assumptions: row.assumptions ?? [],
    generatedAt: row.created_at,
    expiresAt: row.expires_at ?? row.created_at,
  };
}

/** Reads back an athlete's most recent predictions, most recent first. */
export async function fetchRecentPredictions(athleteId: string, limit: number): Promise<Prediction<unknown>[]> {
  const { data, error } = await getSupabase()
    .from("predictions")
    .select("client_prediction_id,kind,category,confidence,lower_bound,upper_bound,assumptions,supporting_insights,value_json,source_metrics,expires_at,created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as StoredPredictionRow[]).map(mapRowToPrediction);
}
