import { describe, expect, it } from "vitest";
import { linearRegression } from "../../analyzers/shared/linearRegression";

describe("linearRegression", () => {
  it("fits a perfect line exactly (slope 2, r-squared 1)", () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 10 + x * 2 }));
    const { slope, rSquared } = linearRegression(points);
    expect(slope).toBeCloseTo(2, 10);
    expect(rSquared).toBeCloseTo(1, 10);
  });

  it("fits a flat line with slope 0", () => {
    const points = [0, 1, 2, 3].map((x) => ({ x, y: 5 }));
    const { slope } = linearRegression(points);
    expect(slope).toBe(0);
  });

  it("returns slope 0 and rSquared 0 when every x is identical (no horizontal spread)", () => {
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ];
    const { slope, rSquared } = linearRegression(points);
    expect(slope).toBe(0);
    expect(rSquared).toBe(0);
  });

  it("returns rSquared 0 when every y is identical (no vertical spread), even with a nonzero slope denominator", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const { rSquared } = linearRegression(points);
    expect(rSquared).toBe(0);
  });

  it("gives a lower rSquared to noisy data than to a clean trend", () => {
    const clean = linearRegression([0, 1, 2, 3, 4].map((x) => ({ x, y: x * 3 })));
    const noisy = linearRegression([
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 1 },
      { x: 3, y: 8 },
      { x: 4, y: 2 },
    ]);
    expect(noisy.rSquared).toBeLessThan(clean.rSquared);
  });
});
