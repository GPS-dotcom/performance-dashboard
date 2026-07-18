import { describe, expect, it } from "vitest";
import { calculateHeartRateZones } from "../heartRateZonesCalculator";

describe("calculateHeartRateZones", () => {
  it("derives 7 zones in ascending bpm bounds from LTHR", () => {
    const result = calculateHeartRateZones(170);
    expect(result.value!.unit).toBe("bpm");
    expect(result.value!.bands).toHaveLength(7);
    expect(result.value!.bands.map((b) => b.zone)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("places LTHR itself inside zone 5 (SuperThreshold)", () => {
    const result = calculateHeartRateZones(170);
    const zone5 = result.value!.bands.find((b) => b.zone === 5)!;
    expect(zone5.lowerBound).toBeLessThanOrEqual(170);
    expect(zone5.upperBound!).toBeGreaterThanOrEqual(170);
  });

  it("leaves the top zone unbounded above", () => {
    const result = calculateHeartRateZones(170);
    expect(result.value!.bands.find((b) => b.zone === 7)!.upperBound).toBeNull();
  });

  it("is unavailable for a non-positive threshold heart rate", () => {
    expect(calculateHeartRateZones(0).value).toBeNull();
  });
});
