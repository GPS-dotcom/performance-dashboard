import type { LactateStage, LactateThreshold } from "../models/lactateStage";
import type { MetricResult } from "../types/metricResult";
import { lactateThresholdResult } from "./shared/lactateInterpolation";

// 4.0 mmol/L is the classic fixed OBLA (Onset of Blood Lactate
// Accumulation) threshold (Sjodin & Jacobs, 1981; Heck et al., 1985),
// the most widely used fixed-value estimate of the anaerobic threshold.
const LT2_THRESHOLD_MMOL = 4.0;

/**
 * LT2 (anaerobic threshold / OBLA): intensity at which lactate
 * production decisively outpaces clearance, estimated here via the
 * fixed 4.0 mmol/L method -- linear interpolation between the two
 * incremental test stages that bracket that concentration.
 */
export function calculateLT2(stages: LactateStage[]): MetricResult<LactateThreshold> {
  return lactateThresholdResult(stages, LT2_THRESHOLD_MMOL);
}
