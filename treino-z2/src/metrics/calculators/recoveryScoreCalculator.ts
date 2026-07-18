import { metricResult, type MetricResult } from "../types/metricResult";

export interface RecoveryInputs {
  /** TSB from calculateTsb -- the primary signal, always required. */
  tsb: number;
  restingHr?: number | null;
  restingHrBaseline?: number | null;
  hrv?: number | null;
  hrvBaseline?: number | null;
}

// TSB conventionally ranges roughly -30 (very fatigued) to +25 (very
// fresh) for most athletes; clamp and scale that band into 0-100.
function tsbToScore(tsb: number): number {
  const clamped = Math.max(-30, Math.min(25, tsb));
  return ((clamped + 30) / 55) * 100;
}

/**
 * Recovery Score: primarily derived from TSB (a Metrics-Engine-owned
 * measure of freshness), refined by resting HR and HRV deviation from the
 * athlete's own baseline when a RecoverySnapshot is available. Degrades
 * gracefully -- and says so via missingInputs/dataQuality -- when only TSB
 * is available, which is the common case without a wearable integration.
 */
export function calculateRecoveryScore(inputs: RecoveryInputs): MetricResult<number> {
  const requiredInputs = ["tsb (from calculateTsb)"];
  const missingInputs: string[] = [];
  let score = tsbToScore(inputs.tsb);
  let signalsUsed = 1;

  if (inputs.restingHr != null && inputs.restingHrBaseline != null && inputs.restingHrBaseline > 0) {
    const deltaPercent = ((inputs.restingHr - inputs.restingHrBaseline) / inputs.restingHrBaseline) * 100;
    // Elevated resting HR vs. baseline is a classic under-recovery signal.
    score -= Math.max(0, deltaPercent) * 3;
    signalsUsed++;
  } else {
    missingInputs.push("resting_hr / resting_hr baseline (RecoverySnapshot)");
  }

  if (inputs.hrv != null && inputs.hrvBaseline != null && inputs.hrvBaseline > 0) {
    const deltaPercent = ((inputs.hrv - inputs.hrvBaseline) / inputs.hrvBaseline) * 100;
    // Depressed HRV vs. baseline is a classic under-recovery signal.
    score += Math.min(0, deltaPercent) * 2;
    signalsUsed++;
  } else {
    missingInputs.push("hrv / hrv baseline (RecoverySnapshot)");
  }

  score = Math.max(0, Math.min(100, score));
  const dataQuality: "high" | "medium" | "low" = signalsUsed >= 3 ? "high" : signalsUsed === 2 ? "medium" : "low";

  return metricResult(score, signalsUsed / 3, dataQuality, requiredInputs, missingInputs);
}
