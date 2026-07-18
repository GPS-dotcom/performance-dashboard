import { describe, expect, it } from "vitest";
import { calculateRunningEffectiveness } from "../runningEffectiveness";

describe("calculateRunningEffectiveness", () => {
  it("computes speed (m/min) divided by power (W/kg)", () => {
    // speed 3.5 m/s -> 210 m/min; power 250W / 70kg -> 3.5714286 W/kg; RE = 210 / 3.5714286 = 58.8
    const result = calculateRunningEffectiveness(3.5, 250, 70);
    expect(result.value).toBeCloseTo(58.8, 6);
    expect(result.dataQuality).toBe("high");
  });

  it("is unavailable when speed is missing or non-positive", () => {
    expect(calculateRunningEffectiveness(null, 250, 70).value).toBeNull();
    expect(calculateRunningEffectiveness(0, 250, 70).value).toBeNull();
  });

  it("is unavailable when power is missing", () => {
    const result = calculateRunningEffectiveness(3.5, null, 70);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("power_watts");
  });

  it("is unavailable when athlete weight is missing", () => {
    const result = calculateRunningEffectiveness(3.5, 250, null);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("athlete weight_kg");
  });

  it("reports every missing input at once", () => {
    const result = calculateRunningEffectiveness(null, null, null);
    expect(result.missingInputs).toEqual(["speed_mps", "power_watts", "athlete weight_kg"]);
  });
});
