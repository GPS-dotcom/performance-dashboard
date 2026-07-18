import { unavailableMetric, metricResult, type MetricResult } from "../types/metricResult";
import type { ZoneTable } from "../types/zones";
import { isPositiveNumber } from "../validators/numberValidators";
import { buildZoneTable } from "./shared/zoneTableBuilder";

// Joe Friel's 7-zone heart rate model, expressed as % of Lactate
// Threshold Heart Rate (Friel, "The Triathlete's Training Bible" / "The
// Cyclist's Training Bible") -- widely used across coaching platforms
// (e.g. TrainingPeaks) as the standard LTHR-based zone system. Friel's
// 5a/5b/5c are mapped onto zones 5/6/7 here for a consistent 1-7 scale
// with the power zone system.
const LTHR_PERCENT_BANDS: { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7; name: string; lower: number; upper: number | null }[] = [
  { zone: 1, name: "Recovery", lower: 0, upper: 0.81 },
  { zone: 2, name: "Aerobic", lower: 0.81, upper: 0.89 },
  { zone: 3, name: "Tempo", lower: 0.9, upper: 0.93 },
  { zone: 4, name: "SubThreshold", lower: 0.94, upper: 0.99 },
  { zone: 5, name: "SuperThreshold", lower: 1.0, upper: 1.02 },
  { zone: 6, name: "Aerobic Capacity", lower: 1.03, upper: 1.06 },
  { zone: 7, name: "Anaerobic Capacity", lower: 1.07, upper: null },
];

/** Heart rate training zones in bpm, derived from Lactate Threshold Heart Rate via Friel's 7-zone %LTHR model. */
export function calculateHeartRateZones(thresholdHeartRateBpm: number): MetricResult<ZoneTable> {
  const requiredInputs = ["threshold_heart_rate_bpm (LTHR, e.g. from a 30-minute time-trial average)"];
  if (!isPositiveNumber(thresholdHeartRateBpm)) return unavailableMetric(requiredInputs, ["threshold_heart_rate_bpm"]);

  const table = buildZoneTable(
    "bpm",
    LTHR_PERCENT_BANDS.map((b) => ({
      zone: b.zone,
      name: b.name,
      lowerBound: Math.round(b.lower * thresholdHeartRateBpm),
      upperBound: b.upper == null ? null : Math.round(b.upper * thresholdHeartRateBpm),
    })),
  );

  return metricResult(table, 0.9, "high", requiredInputs);
}
