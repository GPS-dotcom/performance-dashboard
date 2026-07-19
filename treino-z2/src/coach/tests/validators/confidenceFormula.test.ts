import { describe, expect, it } from "vitest";
import { generalConfidence } from "../../validators/confidenceFormula";

describe("generalConfidence", () => {
  it("returns the base confidence when there are no supporting signals", () => {
    expect(generalConfidence(0)).toBe(0.6);
  });

  it("increases with each supporting signal", () => {
    expect(generalConfidence(1)).toBeCloseTo(0.68, 5);
    expect(generalConfidence(2)).toBeCloseTo(0.76, 5);
  });

  it("caps at the documented ceiling regardless of how many signals are given", () => {
    expect(generalConfidence(10)).toBe(0.85);
  });
});
