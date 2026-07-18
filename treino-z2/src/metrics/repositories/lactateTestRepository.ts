import { getSupabase } from "../../api/supabaseClient";
import type { LactateStage } from "../models/lactateStage";

interface LactateTestStageRow {
  stage_number: number;
  speed_mps: number | null;
  power_watts: number | null;
  heart_rate: number | null;
  blood_lactate_mmol: number;
}

function mapStageRow(row: LactateTestStageRow): LactateStage {
  return {
    stageNumber: row.stage_number,
    speedMps: row.speed_mps,
    powerWatts: row.power_watts,
    heartRate: row.heart_rate,
    bloodLactateMmol: row.blood_lactate_mmol,
  };
}

/**
 * Reads the raw incremental-test stages for one lactate test from
 * `lactate_test_stages` (migration 0006). This is the only place in the
 * app that reads this table -- without it, lt1Calculator/lt2Calculator
 * have no real data source, since they're kept stateless and take stage
 * data as a plain argument.
 */
export async function fetchLactateTestStages(lactateTestId: string): Promise<LactateStage[]> {
  const { data, error } = await getSupabase()
    .from("lactate_test_stages")
    .select("stage_number,speed_mps,power_watts,heart_rate,blood_lactate_mmol")
    .eq("lactate_test_id", lactateTestId)
    .order("stage_number", { ascending: true });

  if (error) throw error;
  return (data as LactateTestStageRow[]).map(mapStageRow);
}
