import { describe, expect, it } from "vitest";
import { exponentialMovingAverage } from "../ewma";

describe("exponentialMovingAverage", () => {
  it("returns an empty series for empty input", () => {
    expect(exponentialMovingAverage([], 7)).toEqual([]);
  });

  it("starts from 0 and moves toward a constant load", () => {
    const series = exponentialMovingAverage(
      [
        { date: "2026-01-01", load: 100 },
        { date: "2026-01-02", load: 100 },
        { date: "2026-01-03", load: 100 },
      ],
      7,
    );
    expect(series).toHaveLength(3);
    expect(series[0].value).toBeCloseTo(100 / 7, 5);
    // Monotonically increasing toward 100 as long as it's still below it.
    expect(series[1].value).toBeGreaterThan(series[0].value);
    expect(series[2].value).toBeGreaterThan(series[1].value);
    expect(series[2].value).toBeLessThan(100);
  });

  it("fills gaps in the input with load = 0 for missing days", () => {
    const series = exponentialMovingAverage(
      [
        { date: "2026-01-01", load: 100 },
        { date: "2026-01-04", load: 100 },
      ],
      7,
    );
    // 4 days present: 01-01, 01-02 (gap, load 0), 01-03 (gap, load 0), 01-04.
    expect(series.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
    // Since day 2 and 3 have 0 load, the average should decay between day 1 and day 4.
    expect(series[1].value).toBeLessThan(series[0].value);
  });

  it("sums multiple entries on the same date", () => {
    const series = exponentialMovingAverage(
      [
        { date: "2026-01-01", load: 40 },
        { date: "2026-01-01", load: 60 },
      ],
      7,
    );
    expect(series).toHaveLength(1);
    expect(series[0].value).toBeCloseTo(100 / 7, 5);
  });

  it("sorts unsorted input by date before processing", () => {
    const series = exponentialMovingAverage(
      [
        { date: "2026-01-03", load: 10 },
        { date: "2026-01-01", load: 100 },
      ],
      7,
    );
    expect(series.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});
