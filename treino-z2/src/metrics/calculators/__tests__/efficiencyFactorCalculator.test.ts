import { describe, expect, it } from "vitest";
import { calculateEfficiencyFactor } from "../efficiencyFactorCalculator";

describe("calculateEfficiencyFactor", () => {
  it("computes normalized power / average HR for cycling", () => {
    const result = calculateEfficiencyFactor(200, "watts", 140);
    expect(result.value).toBeCloseTo(200 / 140, 5);
  });

  it("computes normalized graded pace / average HR for running", () => {
    const result = calculateEfficiencyFactor(180, "m_per_min", 150);
    expect(result.value).toBeCloseTo(180 / 150, 5);
  });

  it("is unavailable when output is missing", () => {
    expect(calculateEfficiencyFactor(null, "watts", 140).value).toBeNull();
  });

  it("is unavailable when heart rate is missing", () => {
    const result = calculateEfficiencyFactor(200, "watts", null);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("average_heart_rate");
  });

  it("names the correct required input for each unit", () => {
    expect(calculateEfficiencyFactor(null, "watts", 140).requiredInputs[0]).toBe("normalized_power_watts");
    expect(calculateEfficiencyFactor(null, "m_per_min", 140).requiredInputs[0]).toBe("normalized_graded_pace_m_per_min");
  });
});
