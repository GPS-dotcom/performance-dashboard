import { metricResult, unavailableMetric, type MetricResult } from "./metricResult";

export interface ActivityRecordPoint {
  recordedAt: string;
  speedMps: number | null;
  heartRate: number | null;
}

export interface HrDriftResult {
  /** Positive = cardiac drift (HR rising for the same pace/effort). Negative = improving efficiency. */
  decouplingPercent: number;
  firstHalfRatio: number;
  secondHalfRatio: number;
}

const MIN_RECORDS = 20;
// ~10 minutes at 1Hz is a reasonable bar for a "high" quality drift read on a single-sport activity.
const HIGH_QUALITY_RECORD_COUNT = 600;

/**
 * HR Drift (aerobic decoupling), Pa:HR method: split an activity's records
 * into two equal-duration halves, compute the average speed:HR ratio in
 * each half, and express the change as a percentage of the first half's
 * ratio. If HR climbs while pace holds steady, the ratio falls in the
 * second half and decouplingPercent is positive.
 */
export function calculateHrDrift(records: ActivityRecordPoint[]): MetricResult<HrDriftResult> {
  const requiredInputs = ["activity records with speed_mps, heart_rate and recorded_at"];

  const usable = records.filter(
    (r) => r.speedMps != null && r.speedMps > 0 && r.heartRate != null && r.heartRate > 0 && r.recordedAt,
  );
  if (usable.length < MIN_RECORDS) {
    return unavailableMetric(requiredInputs, [`fewer than ${MIN_RECORDS} usable records`]);
  }

  const sorted = [...usable].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgRatio = (points: ActivityRecordPoint[]) => {
    const ratios = points.map((p) => p.speedMps! / p.heartRate!);
    return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  };

  const firstHalfRatio = avgRatio(firstHalf);
  const secondHalfRatio = avgRatio(secondHalf);

  if (firstHalfRatio === 0) {
    return unavailableMetric(requiredInputs, ["first-half pace:HR ratio is zero"]);
  }

  const decouplingPercent = ((firstHalfRatio - secondHalfRatio) / firstHalfRatio) * 100;
  const dataQuality: "high" | "medium" | "low" =
    usable.length >= HIGH_QUALITY_RECORD_COUNT ? "high" : usable.length >= 100 ? "medium" : "low";

  return metricResult(
    { decouplingPercent, firstHalfRatio, secondHalfRatio },
    Math.min(1, usable.length / HIGH_QUALITY_RECORD_COUNT),
    dataQuality,
    requiredInputs,
  );
}
