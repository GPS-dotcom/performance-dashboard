import { describe, expect, it } from "vitest";
import { heuristicBound, regressionPredictionInterval } from "../../algorithms/shared/confidenceInterval";

describe("regressionPredictionInterval", () => {
  it("returns null when residualStdError is null (n <= 2)", () => {
    expect(regressionPredictionInterval(100, 5, null, 2, 2, 4)).toBeNull();
  });

  it("returns null when sumSquaredX is 0 (no horizontal spread)", () => {
    expect(regressionPredictionInterval(100, 5, 2, 3, 5, 0)).toBeNull();
  });

  it("returns a symmetric interval around the point estimate", () => {
    const interval = regressionPredictionInterval(100, 5, 2, 5, 4, 10)!;
    const midpoint = (interval.lowerBound + interval.upperBound) / 2;
    expect(midpoint).toBeCloseTo(100, 10);
    expect(interval.upperBound).toBeGreaterThan(interval.lowerBound);
  });

  it("widens the interval as x0 moves further from meanX", () => {
    const near = regressionPredictionInterval(100, 4, 2, 5, 4, 10)!;
    const far = regressionPredictionInterval(100, 40, 2, 5, 4, 10)!;
    const nearWidth = near.upperBound - near.lowerBound;
    const farWidth = far.upperBound - far.lowerBound;
    expect(farWidth).toBeGreaterThan(nearWidth);
  });

  it("widens the interval as residualStdError grows", () => {
    const tight = regressionPredictionInterval(100, 5, 1, 5, 4, 10)!;
    const loose = regressionPredictionInterval(100, 5, 5, 5, 4, 10)!;
    expect(loose.upperBound - loose.lowerBound).toBeGreaterThan(tight.upperBound - tight.lowerBound);
  });
});

describe("heuristicBound", () => {
  it("collapses to the point value when confidence is 1", () => {
    const bound = heuristicBound(50, 1, 20);
    expect(bound.lowerBound).toBe(50);
    expect(bound.upperBound).toBe(50);
  });

  it("spans the full maxHalfWidth on each side when confidence is 0", () => {
    const bound = heuristicBound(50, 0, 20);
    expect(bound.lowerBound).toBe(30);
    expect(bound.upperBound).toBe(70);
  });

  it("scales linearly with confidence in between", () => {
    const bound = heuristicBound(50, 0.5, 20);
    expect(bound.lowerBound).toBe(40);
    expect(bound.upperBound).toBe(60);
  });

  it("clamps out-of-range confidence into [0, 1] rather than producing a negative half-width", () => {
    const boundAboveOne = heuristicBound(50, 1.5, 20);
    expect(boundAboveOne.lowerBound).toBe(50);
    expect(boundAboveOne.upperBound).toBe(50);

    const boundBelowZero = heuristicBound(50, -0.5, 20);
    expect(boundBelowZero.lowerBound).toBe(30);
    expect(boundBelowZero.upperBound).toBe(70);
  });
});
