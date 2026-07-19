import { getSupabase } from "../../api/supabaseClient";

export interface LactateTestSummary {
  id: string;
  testDate: string;
  testType: "pace" | "power";
  notes: string | null;
}

interface LactateTestRow {
  id: string;
  test_date: string;
  test_type: "pace" | "power";
  notes: string | null;
}

/**
 * Lists an athlete's recorded lactate tests (`lactate_tests`, migration
 * 0006) newest-first. Read-only presentation query -- LT1/LT2 for a given
 * test are still computed exclusively by metrics/services/lactateThresholdService,
 * never here. Same defensive fallback as goalService/athleteProfileService:
 * a missing table or empty result reads as "no tests recorded yet."
 */
export async function fetchLactateTests(athleteId: string, limit = 50): Promise<LactateTestSummary[]> {
  try {
    const { data, error } = await getSupabase()
      .from("lactate_tests")
      .select("id,test_date,test_type,notes")
      .eq("athlete_id", athleteId)
      .order("test_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[laboratoryService] could not fetch lactate tests:", error.message);
      return [];
    }
    return (data as LactateTestRow[]).map((row) => ({ id: row.id, testDate: row.test_date, testType: row.test_type, notes: row.notes }));
  } catch (err) {
    console.warn("[laboratoryService] unexpected error fetching lactate tests:", err);
    return [];
  }
}
