import type { ZoneBand, ZoneSystemUnit, ZoneTable } from "../../types/zones";

/** Assembles a ZoneTable from bands each calculator has already computed in its own unit. */
export function buildZoneTable(unit: ZoneSystemUnit, bands: ZoneBand[]): ZoneTable {
  return { unit, bands: [...bands].sort((a, b) => a.zone - b.zone) };
}
