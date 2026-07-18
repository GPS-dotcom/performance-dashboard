import { unavailableMetric, metricResult, type MetricResult } from "../types/metricResult";
import type { ZoneTable } from "../types/zones";
import { isPositiveNumber } from "../validators/numberValidators";
import { buildZoneTable } from "./shared/zoneTableBuilder";

// Andrew Coggan's classic 7-zone power model, expressed as % of FTP
// (Allen & Coggan, "Training and Racing with a Power Meter", 3rd ed.) --
// the industry-standard power zone system, used identically across
// TrainingPeaks, WKO, Zwift and most power-based coaching platforms.
const FTP_PERCENT_BANDS: { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7; name: string; lower: number; upper: number | null }[] = [
  { zone: 1, name: "Active Recovery", lower: 0, upper: 0.55 },
  { zone: 2, name: "Endurance", lower: 0.56, upper: 0.75 },
  { zone: 3, name: "Tempo", lower: 0.76, upper: 0.9 },
  { zone: 4, name: "Lactate Threshold", lower: 0.91, upper: 1.05 },
  { zone: 5, name: "VO2max", lower: 1.06, upper: 1.2 },
  { zone: 6, name: "Anaerobic Capacity", lower: 1.21, upper: 1.5 },
  { zone: 7, name: "Neuromuscular Power", lower: 1.51, upper: null },
];

/** Power training zones as absolute watts, derived from FTP via Coggan's 7-zone %FTP model. */
export function calculatePowerZones(ftpWatts: number): MetricResult<ZoneTable> {
  const requiredInputs = ["ftp_watts"];
  if (!isPositiveNumber(ftpWatts)) return unavailableMetric(requiredInputs, ["ftp_watts"]);

  const table = buildZoneTable(
    "watts",
    FTP_PERCENT_BANDS.map((b) => ({
      zone: b.zone,
      name: b.name,
      lowerBound: Math.round(b.lower * ftpWatts),
      upperBound: b.upper == null ? null : Math.round(b.upper * ftpWatts),
    })),
  );

  return metricResult(table, 0.95, "high", requiredInputs);
}
