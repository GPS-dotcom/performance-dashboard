import { describe, expect, it } from "vitest";
import { summarizeEvolution } from "../evolution";

describe("summarizeEvolution", () => {
  it("summarizes the change from the first to the last point", () => {
    const result = summarizeEvolution("LT1", [
      { date: "2026-06-01", value: 40 },
      { date: "2026-06-15", value: 45 },
      { date: "2026-07-01", value: 50 },
    ]);
    expect(result!.firstValue).toBe(40);
    expect(result!.lastValue).toBe(50);
    expect(result!.absoluteChange).toBe(10);
    expect(result!.percentChange).toBeCloseTo(25, 6);
    expect(result!.direction).toBe("improved");
  });

  it("sorts out-of-order input by date before comparing", () => {
    const result = summarizeEvolution("LT1", [
      { date: "2026-07-01", value: 50 },
      { date: "2026-06-01", value: 40 },
    ]);
    expect(result!.firstValue).toBe(40);
    expect(result!.lastValue).toBe(50);
  });

  it("treats a rising value as a decline when lower is better", () => {
    const result = summarizeEvolution("Pace", [
      { date: "2026-06-01", value: 260 },
      { date: "2026-07-01", value: 280 },
    ], "lower_is_better");
    expect(result!.direction).toBe("declined");
  });

  it("reports unchanged when the value doesn't move", () => {
    const result = summarizeEvolution("LT1", [
      { date: "2026-06-01", value: 40 },
      { date: "2026-07-01", value: 40 },
    ]);
    expect(result!.direction).toBe("unchanged");
  });

  it("returns null with fewer than 2 points", () => {
    expect(summarizeEvolution("LT1", [{ date: "2026-06-01", value: 40 }])).toBeNull();
    expect(summarizeEvolution("LT1", [])).toBeNull();
  });

  it("never sets a recommendation", () => {
    const result = summarizeEvolution("LT1", [
      { date: "2026-06-01", value: 40 },
      { date: "2026-07-01", value: 50 },
    ]);
    expect(result!.recommendation).toBeNull();
  });
});
