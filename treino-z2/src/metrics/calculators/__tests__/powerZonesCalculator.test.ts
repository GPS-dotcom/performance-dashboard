import { describe, expect, it } from "vitest";
import { calculatePowerZones } from "../powerZonesCalculator";

describe("calculatePowerZones", () => {
  it("derives 7 zones in ascending watt bounds from FTP", () => {
    const result = calculatePowerZones(300);
    expect(result.value!.unit).toBe("watts");
    expect(result.value!.bands).toHaveLength(7);
    expect(result.value!.bands.map((b) => b.zone)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("places FTP itself (100%) inside zone 4 (Lactate Threshold)", () => {
    const result = calculatePowerZones(300);
    const zone4 = result.value!.bands.find((b) => b.zone === 4)!;
    expect(zone4.lowerBound).toBeLessThanOrEqual(300);
    expect(zone4.upperBound!).toBeGreaterThanOrEqual(300);
  });

  it("leaves the top zone unbounded above", () => {
    const result = calculatePowerZones(300);
    expect(result.value!.bands.find((b) => b.zone === 7)!.upperBound).toBeNull();
  });

  it("is unavailable for a non-positive FTP", () => {
    expect(calculatePowerZones(0).value).toBeNull();
    expect(calculatePowerZones(-10).value).toBeNull();
  });
});
