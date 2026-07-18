import type { LactateStage, LactateThreshold } from "../models/lactateStage";
import type { MetricResult } from "../types/metricResult";
import { lactateThresholdResult } from "./shared/lactateInterpolation";

// Fixed-threshold method: the simplest, most widely cited way to estimate
// the first lactate turn point (aerobic threshold) from an incremental
// test, without needing curve-fitting (e.g. Dmax) that would be much
// easier to get subtly wrong. 2.0 mmol/L is the classic fixed value used
// across the sports-science literature (e.g. Sjodin & Jacobs, 1981) and
// by most consumer lactate-testing protocols.
const LT1_THRESHOLD_MMOL = 2.0;

/**
 * LT1 (aerobic threshold): intensity at which blood lactate first
 * reliably rises above resting levels, estimated here via the fixed
 * 2.0 mmol/L method -- linear interpolation between the two incremental
 * test stages that bracket that concentration.
 */
export function calculateLT1(stages: LactateStage[]): MetricResult<LactateThreshold> {
  return lactateThresholdResult(stages, LT1_THRESHOLD_MMOL);
}
