import { describe, expect, it } from "vitest";
import { calculatePaceZones } from "../paceZonesCalculator";

describe("calculatePaceZones", () => {
  it("derives 7 zones from threshold pace", () => {
    const result = calculatePaceZones(300); // 5:00/km
    expect(result.value!.unit).toBe("sec_per_km");
    expect(result.value!.bands).toHaveLength(7);
    expect(result.value!.bands.map((b) => b.zone)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("places threshold pace itself inside zone 5 (SuperThreshold)", () => {
    const result = calculatePaceZones(300);
    const zone5 = result.value!.bands.find((b) => b.zone === 5)!;
    expect(zone5.lowerBound).toBeLessThanOrEqual(300);
    expect(zone5.upperBound!).toBeGreaterThanOrEqual(300);
  });

  it("gives zone 1 (Recovery) the slowest (largest sec/km) bound, unbounded above", () => {
    const result = calculatePaceZones(300);
    const zone1 = result.value!.bands.find((b) => b.zone === 1)!;
    const zone7 = result.value!.bands.find((b) => b.zone === 7)!;
    expect(zone1.upperBound).toBeNull();
    expect(zone1.lowerBound).toBeGreaterThan(zone7.lowerBound);
  });

  it("is unavailable for a non-positive threshold pace", () => {
    expect(calculatePaceZones(0).value).toBeNull();
  });
});
