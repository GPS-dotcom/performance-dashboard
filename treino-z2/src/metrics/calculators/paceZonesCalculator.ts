import { unavailableMetric, metricResult, type MetricResult } from "../types/metricResult";
import type { ZoneTable } from "../types/zones";
import { isPositiveNumber } from "../validators/numberValidators";
import { buildZoneTable } from "./shared/zoneTableBuilder";

// Joe Friel's running pace zones, expressed as % of Threshold Pace
// (Friel, "The Triathlete's Training Bible"; adapted for running by
// TrainingPeaks as "Joe Friel's Running Training Zones") -- the same
// 7-zone philosophy as his heart rate zones, applied to pace instead.
// Percentages are of *pace* (seconds per km): since a lower pace value
// means running faster, zone 1 (easiest) has the *highest* %, and zone 7
// (hardest) has the *lowest* %, the mirror image of the HR/power tables.
const THRESHOLD_PACE_PERCENT_BANDS: { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7; name: string; lower: number; upper: number | null }[] = [
  { zone: 7, name: "Anaerobic Capacity", lower: 0, upper: 0.9 },
  { zone: 6, name: "Aerobic Capacity", lower: 0.9, upper: 0.96 },
  { zone: 5, name: "SuperThreshold", lower: 0.97, upper: 1.0 },
  { zone: 4, name: "SubThreshold", lower: 1.01, upper: 1.05 },
  { zone: 3, name: "Tempo", lower: 1.06, upper: 1.13 },
  { zone: 2, name: "Aerobic", lower: 1.14, upper: 1.29 },
  { zone: 1, name: "Recovery", lower: 1.3, upper: null },
];

/**
 * Running pace zones in seconds per km, derived from Threshold Pace via
 * Friel's 7-zone %-of-threshold-pace model. `thresholdPaceSecPerKm`
 * should come from a ~30-minute time-trial average pace (or LT2/calculateLT2
 * when a lactate test with speed data is available).
 */
export function calculatePaceZones(thresholdPaceSecPerKm: number): MetricResult<ZoneTable> {
  const requiredInputs = ["threshold_pace_sec_per_km (e.g. from a 30-minute time-trial average pace)"];
  if (!isPositiveNumber(thresholdPaceSecPerKm)) return unavailableMetric(requiredInputs, ["threshold_pace_sec_per_km"]);

  const table = buildZoneTable(
    "sec_per_km",
    THRESHOLD_PACE_PERCENT_BANDS.map((b) => ({
      zone: b.zone,
      name: b.name,
      lowerBound: Math.round(b.lower * thresholdPaceSecPerKm),
      upperBound: b.upper == null ? null : Math.round(b.upper * thresholdPaceSecPerKm),
    })),
  );

  return metricResult(table, 0.9, "high", requiredInputs);
}
