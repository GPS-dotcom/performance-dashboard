import { metricResult, unavailableMetric, type MetricResult } from "./metricResult";

export interface MaximalEffort {
  durationSec: number;
  powerWatts: number;
}

export interface CriticalPowerResult {
  criticalPowerWatts: number;
  anaerobicWorkCapacityJ: number; // W'
  rSquared: number;
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  for (const p of points) {
    ssXY += (p.x - meanX) * (p.y - meanY);
    ssXX += (p.x - meanX) ** 2;
    ssYY += (p.y - meanY) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);

  return { slope, intercept, rSquared };
}

/**
 * Critical Power via the classic 2-parameter (Monod-Scherrer) model:
 * total work at a given duration is W(t) = CP*t + W'. Linear regression
 * of work (power x duration) against duration gives CP as the slope and
 * W' (anaerobic work capacity) as the intercept. Needs at least 2 maximal
 * efforts at distinct durations; 3+ (e.g. ~3min, ~12min, ~20min) gives a
 * meaningfully more reliable fit.
 */
export function calculateCriticalPower(efforts: MaximalEffort[]): MetricResult<CriticalPowerResult> {
  const requiredInputs = ["maximal efforts at >= 2 distinct durations (power_watts, duration_sec)"];

  const distinctDurations = new Set(efforts.map((e) => e.durationSec));
  if (efforts.length < 2 || distinctDurations.size < 2) {
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
