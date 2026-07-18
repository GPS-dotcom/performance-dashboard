import { getSupabase } from "../../api/supabaseClient";

export type PredictionKind =
  | "race_prediction"
  | "lt1_evolution"
  | "lt2_evolution"
  | "critical_power_projection"
  | "injury_risk"
  | "recovery_time";

export interface PredictionRecord {
  kind: PredictionKind;
  targetDistanceKm?: number | null;
  predictedValue: number;
  unit: string;
  confidence: number;
  sourceMetrics: Record<string, unknown>;
}

/**
 * Persists a Prediction to the `predictions` table (see
 * 0002_treino_z2_extended_entities.sql / 0007_prediction_engine.sql for
 * the `kind` values this table accepts). The only impure function in this
 * engine -- every calculation above is a pure function over Metrics
 * Engine output.
 */
export async function savePrediction(athleteId: string, record: PredictionRecord): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("predictions")
    .insert({
      athlete_id: athleteId,
      kind: record.kind,
      target_distance_km: record.targetDistanceKm ?? null,
      predicted_value: record.predictedValue,
      unit: record.unit,
      confidence: record.confidence,
      source_metrics: record.sourceMetrics,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[PredictionEngine] failed to persist prediction:", error, { athleteId, kind: record.kind });
    return null;
  }
  return data as { id: string };
}
