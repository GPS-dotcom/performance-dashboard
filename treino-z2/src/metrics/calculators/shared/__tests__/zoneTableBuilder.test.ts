import { describe, expect, it } from "vitest";
import { buildZoneTable } from "../zoneTableBuilder";

describe("buildZoneTable", () => {
  it("sorts bands by zone number regardless of input order", () => {
    const table = buildZoneTable("watts", [
      { zone: 2, name: "b", lowerBound: 10, upperBound: 20 },
      { zone: 1, name: "a", lowerBound: 0, upperBound: 9 },
    ]);
    expect(table.unit).toBe("watts");
    expect(table.bands.map((b) => b.zone)).toEqual([1, 2]);
  });

  it("preserves each band's bounds", () => {
    const table = buildZoneTable("bpm", [{ zone: 1, name: "a", lowerBound: 0, upperBound: null }]);
    expect(table.bands[0]).toEqual({ zone: 1, name: "a", lowerBound: 0, upperBound: null });
  });
});
