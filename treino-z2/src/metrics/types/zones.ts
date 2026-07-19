// Shared shape for every zone system (Heart Rate, Power, Pace) so the
// zone calculators produce a uniform table the zoneClassifierAnalyzer can
// consume regardless of which physiological signal it's built from.

export type ZoneNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ZoneBand {
  zone: ZoneNumber;
  name: string;
  /** Inclusive lower bound, in the zone system's native unit. */
  lowerBound: number;
  /** Inclusive upper bound, or null for the top zone (unbounded above). */
  upperBound: number | null;
}

export type ZoneSystemUnit = "bpm" | "watts" | "sec_per_km";

export interface ZoneTable {
  unit: ZoneSystemUnit;
  bands: ZoneBand[];
}
