import { describe, expect, it } from "vitest";
import { isFiniteNumber, isPositiveNumber } from "../../validators/numberValidators";

describe("isPositiveNumber", () => {
  it("returns true for a positive finite number", () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(0.001)).toBe(true);
  });

  it("returns false for zero, negative numbers, non-numbers, NaN and Infinity", () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber("5")).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
  });
});

describe("isFiniteNumber", () => {
  it("returns true for any finite number, including 0 and negatives", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-5)).toBe(true);
    expect(isFiniteNumber(3.14)).toBe(true);
  });

  it("returns false for non-numbers, NaN and Infinity", () => {
    expect(isFiniteNumber("5")).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(-Infinity)).toBe(false);
  });
});
