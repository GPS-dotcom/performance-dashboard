import { describe, expect, it } from "vitest";
import { linearRegression } from "../linearRegression";

describe("linearRegression", () => {
  it("fits a perfect line exactly", () => {
    const result = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    expect(result.slope).toBeCloseTo(2, 5);
    expect(result.intercept).toBeCloseTo(1, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it("returns rSquared 0 for a flat (constant-y) series", () => {
    const result = linearRegression([
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ]);
    expect(result.slope).toBe(0);
    expect(result.rSquared).toBe(0);
  });

  it("returns slope 0 when all x values are identical (no horizontal variance)", () => {
    const result = linearRegression([
      { x: 5, y: 1 },
      { x: 5, y: 10 },
    ]);
    expect(result.slope).toBe(0);
    expect(result.rSquared).toBe(0);
  });
});
