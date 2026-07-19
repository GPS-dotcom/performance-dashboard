import type { ZoneBand, ZoneNumber, ZoneTable } from "../types/zones";

/**
 * Which band of `zoneTable` a raw reading falls into -- shared logic for
 * heart rate, power or pace zones alike, since calculateHeartRateZones/
 * calculatePowerZones/calculatePaceZones all produce the same ZoneTable
 * shape. Returns null if `reading` falls below the lowest band (should
 * only happen for a reading of 0 or negative, which isn't physiologically
 * valid input anyway).
 */
export function classifyIntoZone(zoneTable: ZoneTable, reading: number): ZoneBand | null {
  for (const band of zoneTable.bands) {
    const withinLower = reading >= band.lowerBound;
    const withinUpper = band.upperBound == null || reading <= band.upperBound;
    if (withinLower && withinUpper) return band;
  }
  return null;
}

export type TimeInZoneMinutes = Record<ZoneNumber, number>;

function emptyTimeInZone(): TimeInZoneMinutes {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
}

/**
 * Time-in-zone breakdown across a series of (reading, durationMinutes)
 * samples -- e.g. one entry per lap, or per fixed-interval sensor
 * sample. Readings that don't classify into any band (see
 * classifyIntoZone) are skipped rather than silently miscounted.
 */
export function computeTimeInZone(
  zoneTable: ZoneTable,
  samples: { reading: number; durationMinutes: number }[],
): TimeInZoneMinutes {
  const result = emptyTimeInZone();
  for (const sample of samples) {
    const band = classifyIntoZone(zoneTable, sample.reading);
    if (band) result[band.zone] += sample.durationMinutes;
  }
  return result;
}
