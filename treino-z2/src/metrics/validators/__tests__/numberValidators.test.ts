import { describe, expect, it } from "vitest";
import { clamp, isFiniteNumber, isNonNegativeNumber, isPositiveNumber } from "../numberValidators";

describe("isFiniteNumber", () => {
  it("accepts finite numbers", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-5)).toBe(true);
  });
  it("rejects non-numbers, NaN and Infinity", () => {
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
    expect(isFiniteNumber("5")).toBe(false);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
  });
});

describe("isPositiveNumber", () => {
  it("accepts numbers > 0", () => {
    expect(isPositiveNumber(0.01)).toBe(true);
  });
  it("rejects 0, negatives and non-numbers", () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
  });
});

describe("isNonNegativeNumber", () => {
  it("accepts 0 and positive numbers", () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(5)).toBe(true);
  });
  it("rejects negatives", () => {
    expect(isNonNegativeNumber(-0.01)).toBe(false);
  });
});

describe("clamp", () => {
  it("passes through values already in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above the maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
