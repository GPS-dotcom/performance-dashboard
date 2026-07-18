import { metricResult, type MetricResult } from "../types/metricResult";
import { isFiniteNumber } from "../validators/numberValidators";

/**
 * TSB (Training Stress Balance, colloquially "Form"): ctl - atl for the
 * same day (Banister's Fitness-Fatigue model, as popularized by
 * TrainingPeaks/Coggan). Positive TSB means fitness currently exceeds
 * fatigue (fresh); negative means fatigue currently exceeds fitness
 * (tired) -- the same day's calculateCtl/calculateAtl outputs are the
 * only inputs this needs, so unlike them it requires no history of its
 * own.
 */
export function calculateTsb(ctl: number, atl: number): MetricResult<number> {
  const requiredInputs = ["ctl (from calculateCtl)", "atl (from calculateAtl)"];
  if (!isFiniteNumber(ctl) || !isFiniteNumber(atl)) {
    const missing: string[] = [];
    if (!isFiniteNumber(ctl)) missing.push("ctl");
    if (!isFiniteNumber(atl)) missing.push("atl");
    return metricResult<number>(null, 0, "low", requiredInputs, missing);
  }

  return metricResult(ctl - atl, 1, "high", requiredInputs);
}
