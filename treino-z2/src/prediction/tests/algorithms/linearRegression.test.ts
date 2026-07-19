import { describe, expect, it } from "vitest";
import { linearRegression } from "../../algorithms/shared/linearRegression";

describe("linearRegression", () => {
  it("fits a perfect line exactly (slope 2, intercept 10, rSquared 1)", () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 10 + x * 2 }));
    const { slope, intercept, rSquared } = linearRegression(points);
    expect(slope).toBeCloseTo(2, 10);
    expect(intercept).toBeCloseTo(10, 10);
    expect(rSquared).toBeCloseTo(1, 10);
  });

  it("fits a flat line with slope 0", () => {
    const points = [0, 1, 2, 3].map((x) => ({ x, y: 5 }));
    expect(linearRegression(points).slope).toBe(0);
  });

  it("returns slope 0 and rSquared 0 when every x is identical", () => {
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ];
    const { slope, rSquared } = linearRegression(points);
    expect(slope).toBe(0);
    expect(rSquared).toBe(0);
  });

  it("returns rSquared 0 when every y is identical, even with a nonzero slope denominator", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    expect(linearRegression(points).rSquared).toBe(0);
  });

  it("returns residualStdError null when n <= 2 (undefined degrees of freedom)", () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
    ];
    expect(linearRegression(points).residualStdError).toBeNull();
  });

  it("returns a real residualStdError (0 for a perfect fit) once n > 2", () => {
    const points = [0, 1, 2, 3].map((x) => ({ x, y: x * 2 }));
    expect(linearRegression(points).residualStdError).toBeCloseTo(0, 10);
  });

  it("reports meanX and sumSquaredX consistent with the input points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ];
    const result = linearRegression(points);
    expect(result.meanX).toBe(2);
    expect(result.sumSquaredX).toBe((0 - 2) ** 2 + (2 - 2) ** 2 + (4 - 2) ** 2);
    expect(result.n).toBe(3);
  });
});
