import { describe, expect, it } from "vitest";
import { detectPlateau } from "../plateau";

function series(values: number[], startDate = "2026-06-01"): { date: string; value: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 7 * 86400000).toISOString().slice(0, 10), value }));
}

describe("detectPlateau", () => {
  it("detects a plateau when the recent window barely moves", () => {
    const result = detectPlateau("LT2", series([50, 51, 50, 49, 50, 50]));
    expect(result).not.toBeNull();
    expect(result!.coefficientOfVariation).toBeLessThan(0.03);
    expect(result!.severity).toBe("info");
  });

  it("does not detect a plateau while the metric is still clearly trending", () => {
    const result = detectPlateau("CTL", series([40, 45, 50, 55, 60, 65]));
    expect(result).toBeNull();
  });

  it("only looks at the most recent window, ignoring earlier movement", () => {
    // Big jump early, then flat for the last 6 points.
    const result = detectPlateau("CTL", series([20, 60, 50, 50, 51, 50, 49, 50, 50]));
    expect(result).not.toBeNull();
    expect(result!.windowSize).toBe(6);
  });

  it("returns null with fewer points than the window size", () => {
    expect(detectPlateau("LT2", series([50, 51, 50]))).toBeNull();
  });

  it("never sets a recommendation", () => {
    const result = detectPlateau("LT2", series([50, 51, 50, 49, 50, 50]));
    expect(result!.recommendation).toBeNull();
  });
});
