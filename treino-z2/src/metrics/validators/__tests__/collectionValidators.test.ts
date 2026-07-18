import { describe, expect, it } from "vitest";
import { countDistinctBy, hasMinLength, isMonotonicNonDecreasing } from "../collectionValidators";

describe("hasMinLength", () => {
  it("is true when length meets the minimum", () => {
    expect(hasMinLength([1, 2, 3], 3)).toBe(true);
  });
  it("is false when length is below the minimum", () => {
    expect(hasMinLength([1, 2], 3)).toBe(false);
  });
});

describe("countDistinctBy", () => {
  it("counts distinct keys", () => {
    expect(countDistinctBy([{ x: 1 }, { x: 2 }, { x: 1 }], (i) => i.x)).toBe(2);
  });
  it("returns 0 for an empty array", () => {
    expect(countDistinctBy([] as { x: number }[], (i) => i.x)).toBe(0);
  });
});

describe("isMonotonicNonDecreasing", () => {
  it("is true for a strictly increasing series", () => {
    expect(isMonotonicNonDecreasing([1, 2, 3])).toBe(true);
  });
  it("is true for a series with repeated values", () => {
    expect(isMonotonicNonDecreasing([1, 1, 2])).toBe(true);
  });
  it("is false when a later value drops below an earlier one", () => {
    expect(isMonotonicNonDecreasing([1, 3, 2])).toBe(false);
  });
  it("is true for arrays with 0 or 1 elements", () => {
    expect(isMonotonicNonDecreasing([])).toBe(true);
    expect(isMonotonicNonDecreasing([5])).toBe(true);
  });
});
