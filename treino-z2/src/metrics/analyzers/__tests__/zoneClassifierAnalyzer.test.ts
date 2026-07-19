import { describe, expect, it } from "vitest";
import { classifyIntoZone, computeTimeInZone } from "../zoneClassifierAnalyzer";
import { calculatePowerZones } from "../../calculators/powerZonesCalculator";

const zoneTable = calculatePowerZones(300).value!;

describe("classifyIntoZone", () => {
  it("classifies a reading into the correct band", () => {
    expect(classifyIntoZone(zoneTable, 200)!.zone).toBe(2); // ~67% of 300 FTP -> Endurance (56-75%)
  });

  it("classifies a reading in the unbounded top zone", () => {
    expect(classifyIntoZone(zoneTable, 1000)!.zone).toBe(7);
  });

  it("classifies a reading right at a boundary", () => {
    const zone4 = zoneTable.bands.find((b) => b.zone === 4)!;
    expect(classifyIntoZone(zoneTable, zone4.lowerBound)!.zone).toBe(4);
  });

  it("returns null for a reading below every band (e.g. negative)", () => {
    expect(classifyIntoZone(zoneTable, -10)).toBeNull();
  });
});

describe("computeTimeInZone", () => {
  it("accumulates duration per zone across samples", () => {
    const result = computeTimeInZone(zoneTable, [
      { reading: 200, durationMinutes: 10 }, // zone 2 (56-75% FTP)
      { reading: 200, durationMinutes: 5 }, // zone 2
      { reading: 290, durationMinutes: 20 }, // zone 4 (91-105% FTP)
    ]);
    expect(result[2]).toBe(15);
    expect(result[4]).toBe(20);
    expect(result[1]).toBe(0);
  });

  it("returns all-zero for no samples", () => {
    const result = computeTimeInZone(zoneTable, []);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });

  it("skips samples that don't classify into any zone", () => {
    const result = computeTimeInZone(zoneTable, [{ reading: -10, durationMinutes: 100 }]);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });
});
