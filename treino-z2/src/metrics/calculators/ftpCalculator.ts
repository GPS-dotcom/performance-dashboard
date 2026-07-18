import { metricResult, unavailableMetric, type MetricResult } from "../types/metricResult";
import { isPositiveNumber } from "../validators/numberValidators";

const TWENTY_MINUTE_TEST_FACTOR = 0.95;
// The 0.95 factor is calibrated specifically for a ~20-minute maximal
// effort; allow a tolerance band around that so a slightly-off field test
// still qualifies, but reject efforts far enough off that the factor no
// longer applies.
const MIN_VALID_DURATION_SEC = 18 * 60;
const MAX_VALID_DURATION_SEC = 22 * 60;

export interface TwentyMinuteTestEffort {
  durationSec: number;
  averagePowerWatts: number;
}

/**
 * FTP (Functional Threshold Power) via the classic 20-minute test
 * protocol: FTP = 95% of the best ~20-minute average power (Allen &
 * Coggan, "Training and Racing with a Power Meter", 3rd ed.) -- the
 * 5% discount accounts for the fact that a true 1-hour threshold effort
 * paces slightly below what's sustainable for only 20 minutes.
 */
export function calculateFtp(effort: TwentyMinuteTestEffort): MetricResult<number> {
  const requiredInputs = ["a ~20-minute maximal average power effort (18-22 min)"];

  if (!isPositiveNumber(effort.averagePowerWatts)) {
    return unavailableMetric(requiredInputs, ["average_power_watts"]);
  }
  if (!isPositiveNumber(effort.durationSec) || effort.durationSec < MIN_VALID_DURATION_SEC || effort.durationSec > MAX_VALID_DURATION_SEC) {
    return unavailableMetric(requiredInputs, [
      `effort duration must be between ${MIN_VALID_DURATION_SEC / 60} and ${MAX_VALID_DURATION_SEC / 60} minutes for the 95% factor to apply`,
    ]);
  }

  const ftpWatts = effort.averagePowerWatts * TWENTY_MINUTE_TEST_FACTOR;
  // Confidence is highest exactly at 20:00 and tapers linearly toward the tolerance band's edges.
  const minutesFromTwenty = Math.abs(effort.durationSec - 20 * 60) / 60;
  const confidence = Math.max(0.6, 1 - minutesFromTwenty * 0.15);

  return metricResult(ftpWatts, confidence, confidence >= 0.9 ? "high" : "medium", requiredInputs);
}
