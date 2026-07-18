import { describe, expect, it } from "vitest";
import { detectTrend } from "../trend";

function series(values: number[], startDate = "2026-06-01"): { date: string; value: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("detectTrend", () => {
  it("detects an improving trend for a rising metric under higher_is_better", () => {
    const result = detectTrend("CTL", series([50, 52, 54, 56, 58, 60, 62, 64, 66, 68]), "higher_is_better");
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("improving");
    expect(result!.slopePerDay).toBeCloseTo(2, 6);
    expect(result!.rSquared).toBeCloseTo(1, 6);
  });

  it("detects a declining trend for a falling metric under higher_is_better", () => {
    const result = detectTrend("CTL", series([68, 66, 64, 62, 60, 58, 56, 54, 52, 50]), "higher_is_better");
    expect(result!.direction).toBe("declining");
  });

  it("treats a falling metric as improving when lower is better (e.g. pace)", () => {
    const result = detectTrend("Pace", series([300, 295, 290, 285, 280, 275, 270, 265, 260, 255]), "lower_is_better");
    expect(result!.direction).toBe("improving");
  });

  it("reports stable when the slope is negligible relative to the series mean", () => {
    const result = detectTrend("CTL", series([100, 100.05, 100.1, 100.15, 100.2, 100.25, 100.3, 100.35, 100.4, 100.45]));
    expect(result!.direction).toBe("stable");
  });

  it("returns null with fewer than 4 points", () => {
    expect(detectTrend("CTL", series([50, 52, 54]))).toBeNull();
  });

  it("never sets a recommendation", () => {
    const result = detectTrend("CTL", series([50, 52, 54, 56]));
    expect(result!.recommendation).toBeNull();
  });
});
