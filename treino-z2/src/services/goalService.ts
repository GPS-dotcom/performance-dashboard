import { getSupabase } from "../api/supabaseClient";

export interface UpcomingGoal {
  id: string;
  label: string | null;
  kind: string;
  targetDate: string;
}

interface GoalRow {
  id: string;
  label: string | null;
  kind: string;
  target_date: string;
}

/**
 * Fetches the athlete's nearest upcoming active goal, for the Daily
 * Brief's "Upcoming Races" section. The `goals` table (0002) has not
 * been applied to the live database yet in this project's history (see
 * REFACTOR_REPORT.md / PROJECT_AUDIT.md) -- so any failure here,
 * including "relation does not exist," is treated as "no upcoming race
 * configured" rather than a hard error. The rest of the Daily Brief must
 * keep working even when this section has nothing to show.
 */
export async function fetchUpcomingGoal(): Promise<UpcomingGoal | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await getSupabase()
      .from("goals")
      .select("id,label,kind,target_date")
      .eq("status", "active")
      .not("target_date", "is", null)
      .gte("target_date", today)
      .order("target_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[goalService] could not fetch upcoming goal (table may not exist yet):", error.message);
      return null;
    }
    if (!data) return null;

    const row = data as GoalRow;
    return { id: row.id, label: row.label, kind: row.kind, targetDate: row.target_date };
  } catch (err) {
    console.warn("[goalService] unexpected error fetching upcoming goal:", err);
    return null;
  }
}
