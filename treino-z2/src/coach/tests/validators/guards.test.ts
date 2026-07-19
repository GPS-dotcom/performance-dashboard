import { describe, expect, it } from "vitest";
import { clamp01, hasAnySignal, isFiniteNumber, isPositiveNumber } from "../../validators/guards";

describe("clamp01", () => {
  it("clamps values above 1 down to 1, and below 0 up to 0", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.5)).toBe(0);
  });

  it("passes values already in [0,1] through unchanged", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe("isPositiveNumber", () => {
  it("returns true only for positive finite numbers", () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber("5")).toBe(false);
  });
});

describe("isFiniteNumber", () => {
  it("returns true for any finite number including 0 and negatives", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-3)).toBe(true);
  });

  it("returns false for non-numbers, NaN and Infinity", () => {
    expect(isFiniteNumber("5")).toBe(false);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
  });
});

describe("hasAnySignal", () => {
  it("returns true when at least one value is non-null", () => {
    expect(hasAnySignal(null, null, 5)).toBe(true);
  });

  it("returns false when every value is null or undefined", () => {
    expect(hasAnySignal(null, undefined)).toBe(false);
  });
});
