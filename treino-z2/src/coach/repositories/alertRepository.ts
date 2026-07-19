import { getSupabase } from "../../api/supabaseClient";
import type { Alert, AlertCategory, AlertSeverity } from "../types/alert";

/**
 * Persists an Alert to the `coach_alerts` table (0008_coach_engine.sql,
 * extended by 0012_coach_engine_recommendations_alerts.sql). Upserts on
 * (athlete_id, client_alert_id), same idempotency pattern as
 * recommendationRepository.ts.
 *
 * The legacy `kind`/`message` columns (NOT NULL since 0008) are
 * populated from `category`/`description` for backward compatibility;
 * the full envelope lives in the columns 0012 added.
 */
export async function saveAlert(athleteId: string, alert: Alert): Promise<{ id: string } | null> {
  const { data, error } = await getSupabase()
    .from("coach_alerts")
    .upsert(
      {
        athlete_id: athleteId,
        kind: alert.category,
        severity: alert.severity,
        message: alert.description,
        category: alert.category,
        title: alert.title,
        description: alert.description,
        action_required: alert.actionRequired,
        client_alert_id: alert.id,
      },
      { onConflict: "athlete_id,client_alert_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[CoachEngine] failed to persist alert:", error, { athleteId, id: alert.id });
    return null;
  }
  return data as { id: string };
}

interface StoredAlertRow {
  client_alert_id: string | null;
  category: string | null;
  severity: AlertSeverity;
  title: string | null;
  description: string | null;
  action_required: string | null;
  created_at: string;
}

function mapRowToAlert(row: StoredAlertRow): Alert {
  return {
    id: row.client_alert_id ?? "",
    severity: row.severity,
    category: (row.category ?? "elevated_fatigue") as AlertCategory,
    title: row.title ?? "",
    description: row.description ?? "",
    actionRequired: row.action_required,
    generatedAt: row.created_at,
  };
}

/** Reads back an athlete's most recent alerts, most recent first. */
export async function fetchRecentAlerts(athleteId: string, limit: number): Promise<Alert[]> {
  const { data, error } = await getSupabase()
    .from("coach_alerts")
    .select("client_alert_id,category,severity,title,description,action_required,created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as StoredAlertRow[]).map(mapRowToAlert);
}
