import { describe, expect, it } from "vitest";
import { hasMinPoints, sortByDate } from "../../validators/seriesValidators";

describe("hasMinPoints", () => {
  it("returns true when the array has at least the minimum length", () => {
    expect(hasMinPoints([1, 2, 3], 3)).toBe(true);
    expect(hasMinPoints([1, 2, 3, 4], 3)).toBe(true);
  });

  it("returns false when the array is shorter than the minimum, or not an array", () => {
    expect(hasMinPoints([1, 2], 3)).toBe(false);
    expect(hasMinPoints("not an array" as unknown as unknown[], 1)).toBe(false);
  });
});

describe("sortByDate", () => {
  it("returns a new array sorted ascending by date, without mutating the input", () => {
    const input = [
      { date: "2026-06-03", value: 3 },
      { date: "2026-06-01", value: 1 },
      { date: "2026-06-02", value: 2 },
    ];
    const sorted = sortByDate(input);
    expect(sorted.map((p) => p.value)).toEqual([1, 2, 3]);
    expect(input[0].date).toBe("2026-06-03"); // original order untouched
  });
});
