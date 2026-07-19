import { describe, expect, it } from "vitest";
import { confidenceLevelFor } from "../../rules/confidenceRules";

describe("confidenceLevelFor", () => {
  it("returns very_high at/above 0.85", () => {
    expect(confidenceLevelFor(0.85)).toBe("very_high");
    expect(confidenceLevelFor(1)).toBe("very_high");
  });

  it("returns high in [0.65, 0.85)", () => {
    expect(confidenceLevelFor(0.65)).toBe("high");
    expect(confidenceLevelFor(0.84)).toBe("high");
  });

  it("returns moderate in [0.4, 0.65)", () => {
    expect(confidenceLevelFor(0.4)).toBe("moderate");
    expect(confidenceLevelFor(0.64)).toBe("moderate");
  });

  it("returns low below 0.4", () => {
    expect(confidenceLevelFor(0.39)).toBe("low");
    expect(confidenceLevelFor(0)).toBe("low");
  });
});
