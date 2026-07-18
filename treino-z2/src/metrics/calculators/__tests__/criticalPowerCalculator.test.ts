import { describe, expect, it } from "vitest";
import { calculateCriticalPower } from "../criticalPowerCalculator";

describe("calculateCriticalPower", () => {
  it("recovers CP and W' exactly from synthetic efforts on a known model", () => {
    // W(t) = CP*t + W' with CP=250W, W'=20000J. power(t) = CP + W'/t.
    const cp = 250;
    const wPrime = 20000;
    const efforts = [180, 720, 1200].map((durationSec) => ({
      durationSec,
      powerWatts: cp + wPrime / durationSec,
    }));

    const result = calculateCriticalPower(efforts);
    expect(result.value!.criticalPowerWatts).toBeCloseTo(cp, 1);
    expect(result.value!.anaerobicWorkCapacityJ).toBeCloseTo(wPrime, -1);
    expect(result.value!.rSquared).toBeCloseTo(1, 5);
    expect(result.dataQuality).toBe("high");
  });

  it("is unavailable with fewer than 2 efforts", () => {
    const result = calculateCriticalPower([{ durationSec: 180, powerWatts: 300 }]);
    expect(result.value).toBeNull();
  });

  it("is unavailable when all efforts share the same duration", () => {
    const result = calculateCriticalPower([
      { durationSec: 180, powerWatts: 300 },
      { durationSec: 180, powerWatts: 320 },
    ]);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("fewer than 2 efforts at distinct durations");
  });

  it("is unavailable when the regression produces a non-positive CP", () => {
    // Power decreasing enough with duration that total work vs duration has a negative slope.
    const result = calculateCriticalPower([
      { durationSec: 100, powerWatts: 1000 },
      { durationSec: 200, powerWatts: 1 },
    ]);
    expect(result.value).toBeNull();
  });

  it("reports medium quality with exactly 2 efforts", () => {
    const result = calculateCriticalPower([
      { durationSec: 180, powerWatts: 320 },
      { durationSec: 720, powerWatts: 270 },
    ]);
    expect(result.dataQuality).toBe("medium");
    expect(result.missingInputs.length).toBeGreaterThan(0);
  });
});
