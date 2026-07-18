import type { SessionLoadInput, TrainingLoadMethod } from "../models/sessionLoadInput";
import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { isPositiveNumber } from "../validators/numberValidators";

export interface TrainingLoadResult {
  load: number;
  method: TrainingLoadMethod;
  intensityFactor: number | null;
}

/**
 * Training Load for a single session, in TSS-equivalent points. Picks
 * the most precise method the available inputs support, in order:
 *
 * 1. Power-based TSS (Coggan, "Training and Racing with a Power Meter"):
 *    IF = NP/FTP; TSS = duration_sec * IF^2 / 3600 * 100.
 * 2. HR-based hrTSS: the same structural formula with an HR-based
 *    Intensity Factor (avg HR / threshold HR) in place of the
 *    power-based one -- the standard approximation used when no power
 *    meter is available (documented identically by TrainingPeaks and
 *    other platforms), less precise than power-based TSS since it
 *    doesn't account for cardiac drift within the session.
 * 3. Session-RPE (Foster et al., 2001, "A New Approach to Monitoring
 *    Exercise Training"): load = RPE (Borg CR10, 0-10) x duration in
 *    minutes -- the least precise method, used only when neither power
 *    nor a heart-rate threshold is available.
 */
export function calculateTrainingLoad(input: SessionLoadInput): MetricResult<TrainingLoadResult> {
  const requiredInputs = [
    "duration_sec, plus one of: (normalized_power_watts + ftp_watts), (average_heart_rate + threshold_heart_rate), or rpe",
  ];

  if (!isPositiveNumber(input.durationSec)) {
    return unavailableMetric(requiredInputs, ["duration_sec"]);
  }

  if (isPositiveNumber(input.normalizedPowerWatts) && isPositiveNumber(input.ftpWatts)) {
    const intensityFactor = input.normalizedPowerWatts / input.ftpWatts;
    const load = ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
    return metricResult({ load, method: "power_tss", intensityFactor }, 0.95, "high", requiredInputs);
  }

  if (isPositiveNumber(input.averageHeartRate) && isPositiveNumber(input.thresholdHeartRate)) {
    const intensityFactor = input.averageHeartRate / input.thresholdHeartRate;
    const load = ((input.durationSec * intensityFactor * intensityFactor) / 3600) * 100;
    return metricResult(
      { load, method: "hr_tss", intensityFactor },
      0.75,
      "medium",
      requiredInputs,
      ["power meter data would give a more precise TSS than the HR-based approximation"],
    );
  }

  if (isPositiveNumber(input.rpe)) {
    const durationMin = input.durationSec / 60;
    const load = input.rpe * durationMin;
    return metricResult(
      { load, method: "session_rpe", intensityFactor: null },
      0.5,
      "low",
      requiredInputs,
      ["power or heart-rate-threshold data would give a more precise Training Load than session-RPE"],
    );
  }

  return unavailableMetric(requiredInputs, [
    "none of (power + FTP), (heart rate + threshold HR), or RPE were provided",
  ]);
}
