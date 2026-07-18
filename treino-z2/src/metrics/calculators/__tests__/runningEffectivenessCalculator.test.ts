import { describe, expect, it } from "vitest";
import { calculateRunningEffectiveness } from "../runningEffectivenessCalculator";

describe("calculateRunningEffectiveness", () => {
  it("computes speed(m/min) / power(W/kg)", () => {
    // 3 m/s = 180 m/min. power = 300W / 60kg = 5 W/kg. RE = 180/5 = 36.
    const result = calculateRunningEffectiveness(3, 300, 60);
    expect(result.value).toBeCloseTo(36, 5);
  });

  it("is unavailable when speed is missing or non-positive", () => {
    expect(calculateRunningEffectiveness(null, 300, 60).value).toBeNull();
    expect(calculateRunningEffectiveness(0, 300, 60).value).toBeNull();
  });

  it("is unavailable when power is missing or non-positive", () => {
    expect(calculateRunningEffectiveness(3, null, 60).value).toBeNull();
  });

  it("is unavailable when weight is missing or non-positive", () => {
    expect(calculateRunningEffectiveness(3, 300, null).value).toBeNull();
  });

  it("lists every missing input at once", () => {
    const result = calculateRunningEffectiveness(null, null, null);
    expect(result.missingInputs).toEqual(["speed_mps", "power_watts", "athlete weight_kg"]);
  });
});
