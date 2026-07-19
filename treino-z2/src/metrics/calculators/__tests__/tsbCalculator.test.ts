import { describe, expect, it } from "vitest";
import { calculateTsb } from "../tsbCalculator";

describe("calculateTsb", () => {
  it("is ctl - atl", () => {
    expect(calculateTsb(50, 30).value).toBe(20);
  });

  it("is negative when fatigue exceeds fitness", () => {
    expect(calculateTsb(30, 50).value).toBe(-20);
  });

  it("is unavailable when ctl is not a finite number", () => {
    const result = calculateTsb(NaN, 30);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("ctl");
  });

  it("is unavailable when atl is not a finite number", () => {
    const result = calculateTsb(50, NaN);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("atl");
  });

  it("has full confidence and high data quality when both inputs are valid", () => {
    const result = calculateTsb(50, 30);
    expect(result.confidence).toBe(1);
    expect(result.dataQuality).toBe("high");
  });
});
