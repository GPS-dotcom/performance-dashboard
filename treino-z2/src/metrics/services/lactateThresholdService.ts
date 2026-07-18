import { calculateLT1 } from "../calculators/lt1Calculator";
import { calculateLT2 } from "../calculators/lt2Calculator";
import type { LactateThreshold } from "../models/lactateStage";
import { fetchLactateTestStages } from "../repositories/lactateTestRepository";
import type { MetricResult } from "../types/metricResult";

export interface LactateThresholdsResult {
  lt1: MetricResult<LactateThreshold>;
  lt2: MetricResult<LactateThreshold>;
}

/**
 * Orchestration entry point for lactate thresholds: reads one test's
 * stages from `lactate_test_stages` via lactateTestRepository, then runs
 * both lt1Calculator and lt2Calculator over the same stage data (LT1 and
 * LT2 are two different interpolation targets over one test, not two
 * separate tests).
 */
export async function computeLactateThresholds(lactateTestId: string): Promise<LactateThresholdsResult> {
  const stages = await fetchLactateTestStages(lactateTestId);
  return { lt1: calculateLT1(stages), lt2: calculateLT2(stages) };
}
