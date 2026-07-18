import { getSupabase } from "../../api/supabaseClient";
import type { CoachAlert, Recommendation } from "./types";

export type RecommendationKind = "training" | "recovery" | "race_strategy";

/**
 * Persists a Recommendation to the `recommendations` table. The only
 * impure function alongside saveAlert -- every calculation function in
 * this engine (recommendTraining, analyzeWorkout, recommendRecovery,
 * generateRaceStrategy, detectAlerts, generateDailyBrief) is pure.
 */
export async function saveRecommendation(
  athleteId: string,
  kind: RecommendationKind,
  recommendation: Recommendation,
): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("recommendations")
    .insert({
      athlete_id: athleteId,
      kind,
      recommendation: recommendation.recommendation,
      reason: recommendation.reason,
      evidence: recommendation.evidence,
      confidence: recommendation.confidence,
      expected_outcome: recommendation.expectedOutcome,
      alternative: recommendation.alternative,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[CoachEngine] failed to persist recommendation:", error, { athleteId, kind });
    return null;
  }
  return data as { id: string };
}

/** Persists a CoachAlert to the `coach_alerts` table. */
export async function saveAlert(athleteId: string, alert: CoachAlert): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("coach_alerts")
    .insert({
      athlete_id: athleteId,
      kind: alert.kind,
      severity: alert.severity,
      message: alert.message,
      evidence: alert.evidence,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[CoachEngine] failed to persist alert:", error, { athleteId, kind: alert.kind });
    return null;
  }
  return data as { id: string };
}
