/**
 * Inputs for a single session's Training Load. trainingLoadCalculator picks
 * the most precise method the available fields support -- power-based TSS
 * when normalizedPowerWatts + ftpWatts are present, HR-based hrTSS when
 * averageHeartRate + thresholdHeartRate are present instead, and Foster's
 * session-RPE (rpe x duration) as the last-resort fallback.
 */
export interface SessionLoadInput {
  durationSec: number;
  normalizedPowerWatts?: number | null;
  ftpWatts?: number | null;
  averageHeartRate?: number | null;
  thresholdHeartRate?: number | null;
  /** Borg CR10 rating of perceived exertion, 0-10. */
  rpe?: number | null;
}

export type TrainingLoadMethod = "power_tss" | "hr_tss" | "session_rpe";
