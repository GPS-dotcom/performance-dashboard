import type { MaximalEffort } from "../models/maximalEffort";
import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { countDistinctBy } from "../validators/collectionValidators";
import { linearRegression } from "./shared/linearRegression";

export interface CriticalPowerResult {
  criticalPowerWatts: number;
  /** W' -- anaerobic work capacity, in joules. */
  anaerobicWorkCapacityJ: number;
  rSquared: number;
}

/**
 * Critical Power via the classic 2-parameter (Monod & Scherrer, 1965;
 * Moritani et al., 1981) hyperbolic model, fit as a linear regression:
 * total work at a given duration is W(t) = CP*t + W'. Regressing work
 * (power x duration) against duration gives CP as the slope and W'
 * (anaerobic work capacity) as the intercept. Needs at least 2 maximal
 * efforts at distinct durations; 3+ (e.g. ~3min, ~12min, ~20min) gives a
 * meaningfully more reliable fit.
 */
export function calculateCriticalPower(efforts: MaximalEffort[]): MetricResult<CriticalPowerResult> {
  const requiredInputs = ["maximal efforts at >= 2 distinct durations (power_watts, duration_sec)"];

  const distinctDurations = countDistinctBy(efforts, (e) => e.durationSec);
  if (efforts.length < 2 || distinctDurations < 2) {
    return unavailableMetric(requiredInputs, ["fewer than 2 efforts at distinct durations"]);
  }

  const points = efforts.map((e) => ({ x: e.durationSec, y: e.powerWatts * e.durationSec }));
  const { slope, intercept, rSquared } = linearRegression(points);

  if (slope <= 0) {
    return unavailableMetric(requiredInputs, ["regression produced a non-positive Critical Power"]);
  }

  const result: CriticalPowerResult = {
    criticalPowerWatts: slope,
    anaerobicWorkCapacityJ: Math.max(0, intercept),
    rSquared,
  };

  const dataQuality: "high" | "medium" | "low" =
    efforts.length >= 3 && rSquared >= 0.9 ? "high" : efforts.length >= 2 && rSquared >= 0.7 ? "medium" : "low";
  const missingInputs = efforts.length < 3 ? ["a third effort at a different duration would improve regression reliability"] : [];

  return metricResult(result, Math.max(0, Math.min(1, rSquared)), dataQuality, requiredInputs, missingInputs);
}
