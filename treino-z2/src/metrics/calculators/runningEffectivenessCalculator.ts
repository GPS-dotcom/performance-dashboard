import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";

/**
 * Running Effectiveness (Stryd's running power metric definition): speed
 * produced per unit of power relative to body weight -- speed (m/min) /
 * power (W/kg). Higher is more efficient (more speed for the same
 * relative power output). Distinct from Efficiency Factor, which relates
 * output to *heart rate* (cardiac cost) rather than to body weight.
 */
export function calculateRunningEffectiveness(
  speedMps: number | null,
  powerWatts: number | null,
  weightKg: number | null,
): MetricResult<number> {
  const requiredInputs = ["speed_mps", "power_watts", "athlete weight_kg"];
  const missingInputs: string[] = [];
  if (speedMps == null || speedMps <= 0) missingInputs.push("speed_mps");
  if (powerWatts == null || powerWatts <= 0) missingInputs.push("power_watts");
  if (weightKg == null || weightKg <= 0) missingInputs.push("athlete weight_kg");
  if (missingInputs.length > 0) return unavailableMetric(requiredInputs, missingInputs);

  const speedMPerMin = speedMps! * 60;
  const powerWattsPerKg = powerWatts! / weightKg!;
  const runningEffectiveness = speedMPerMin / powerWattsPerKg;

  return metricResult(runningEffectiveness, 0.9, "high", requiredInputs);
}
