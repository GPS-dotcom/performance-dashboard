import { describe, expect, it } from "vitest";
import { normalizeAgainstOwnRange } from "../rangeNormalization";

describe("normalizeAgainstOwnRange", () => {
  it("maps the minimum of the combined range to 0", () => {
    expect(normalizeAgainstOwnRange(10, [10, 20, 30])).toBe(0);
  });

  it("maps the maximum of the combined range to 100", () => {
    expect(normalizeAgainstOwnRange(30, [10, 20, 30])).toBe(100);
  });

  it("maps a midpoint value proportionally", () => {
    expect(normalizeAgainstOwnRange(20, [10, 30])).toBe(50);
  });

  it("returns 50 when every value (including the current one) is identical", () => {
    expect(normalizeAgainstOwnRange(10, [10, 10, 10])).toBe(50);
  });

  it("includes `value` itself in the range, even if it's outside history's range", () => {
    expect(normalizeAgainstOwnRange(0, [10, 20])).toBe(0);
    expect(normalizeAgainstOwnRange(30, [10, 20])).toBe(100);
  });
});
