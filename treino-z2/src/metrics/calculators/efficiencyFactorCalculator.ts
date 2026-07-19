import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { isPositiveNumber } from "../validators/numberValidators";

export type EfficiencyFactorOutputUnit = "watts" | "m_per_min";

/**
 * Efficiency Factor (Joe Friel, "The Triathlete's Training Bible";
 * popularized for tracking aerobic adaptation by TrainingPeaks):
 * aerobic output per heartbeat -- Normalized Power / Average HR for
 * cycling, or Normalized Graded Pace (speed, m/min) / Average HR for
 * running. A rising EF over time at similar effort indicates improving
 * aerobic fitness (more output for the same cardiac cost). Distinct from
 * Running Effectiveness, which relates speed to power-per-bodyweight
 * rather than to heart rate.
 */
export function calculateEfficiencyFactor(
  output: number | null,
  outputUnit: EfficiencyFactorOutputUnit,
  averageHeartRate: number | null,
): MetricResult<number> {
  const requiredInputs = [
    outputUnit === "watts" ? "normalized_power_watts" : "normalized_graded_pace_m_per_min",
    "average_heart_rate",
  ];
  const missingInputs: string[] = [];
  if (!isPositiveNumber(output)) missingInputs.push(requiredInputs[0]);
  if (!isPositiveNumber(averageHeartRate)) missingInputs.push("average_heart_rate");
  if (missingInputs.length > 0) return unavailableMetric(requiredInputs, missingInputs);

  const efficiencyFactor = output! / averageHeartRate!;
  return metricResult(efficiencyFactor, 0.85, "high", requiredInputs);
}
