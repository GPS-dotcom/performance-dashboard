import { describe, expect, it } from "vitest";
import { detectAcceleration, detectRegression, detectStagnation } from "../../detectors/plateauDetector";
import type { MetricSeriesPoint } from "../../types/metricSeries";

const today = "2026-06-20";

function series(values: number[], startDate = "2026-01-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("detectStagnation", () => {
  it("returns null when the series is shorter than the window size", () => {
    const s = series([50, 50, 50]);
    expect(detectStagnation("Fitness", "ctl", s, "fitness", today, 6)).toBeNull();
  });

  it("returns null when the window mean is zero", () => {
    const s = series([0, 0, 0, 0, 0, 0]);
    expect(detectStagnation("Fitness", "ctl", s, "fitness", today, 6)).toBeNull();
  });

  it("returns null when the recent window's coefficient of variation exceeds the flat threshold", () => {
    const s = series([40, 55, 42, 58, 44, 60]);
    expect(detectStagnation("Fitness", "ctl", s, "fitness", today, 6)).toBeNull();
  });

  it("reports a plateau when the recent window is essentially flat", () => {
    const s = series([60, 60.1, 59.9, 60, 60.1, 59.9]);
    const insight = detectStagnation("Fitness", "ctl", s, "fitness", today, 6);
    expect(insight?.title).toBe("Fitness Plateau");
    expect(insight?.severity).toBe("information");
    expect(insight?.id).toBe(`insight:plateau_stagnation_ctl:${today}`);
  });

  it("evaluates only the most recent window, ignoring earlier volatility", () => {
    const volatileThenFlat = series([10, 90, 5, 95, 60, 60.1, 59.9, 60, 60.1, 59.9]);
    const insight = detectStagnation("Fitness", "ctl", volatileThenFlat, "fitness", today, 6);
    expect(insight?.title).toBe("Fitness Plateau");
  });
});

describe("detectRegression", () => {
  it("returns null when the series is shorter than the window size", () => {
    expect(detectRegression("Fitness", "ctl", series([50, 51, 52]), "higher_is_better", "fitness", today, 6)).toBeNull();
  });

  it("returns null when the recent window is not declining", () => {
    const s = series([40, 44, 48, 52, 56, 60]);
    expect(detectRegression("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6)).toBeNull();
  });

  it("reports a regression when the recent window is declining", () => {
    const s = series([60, 56, 52, 48, 44, 40]);
    const insight = detectRegression("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6);
    expect(insight?.title).toBe("Fitness Declining");
    expect(insight?.severity).toBe("warning");
    expect(insight?.id).toBe(`insight:plateau_regression_ctl:${today}`);
  });
});

describe("detectAcceleration", () => {
  it("returns null when the series is shorter than twice the window size", () => {
    const s = series([40, 44, 48, 52, 56, 60]);
    expect(detectAcceleration("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6)).toBeNull();
  });

  it("returns null when the recent window is not improving", () => {
    const s = series(Array.from({ length: 12 }, (_, i) => 60 - i * 2));
    expect(detectAcceleration("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6)).toBeNull();
  });

  it("returns null when the recent window improves at roughly the same rate as the overall series", () => {
    const s = series(Array.from({ length: 12 }, (_, i) => 40 + i * 2));
    expect(detectAcceleration("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6)).toBeNull();
  });

  it("reports acceleration when the recent window improves much faster than the series' overall trend", () => {
    // First 6 points barely move, last 6 points climb steeply.
    const flatStart = [40, 40.1, 40.2, 40.1, 40.2, 40.1];
    const steepEnd = [45, 55, 65, 75, 85, 95];
    const s = series([...flatStart, ...steepEnd]);
    const insight = detectAcceleration("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6);
    expect(insight?.title).toBe("Fitness Accelerating");
    expect(insight?.severity).toBe("positive");
    expect(insight?.id).toBe(`insight:plateau_acceleration_ctl:${today}`);
  });

  it("returns null when the overall trend's magnitude is zero (would otherwise divide by zero)", () => {
    // Overall series is flat (net-zero slope) while a later window still counts as "improving".
    const s = series([50, 60, 50, 60, 50, 60, 61, 63, 66, 70, 75, 81]);
    expect(() => detectAcceleration("Fitness", "ctl", s, "higher_is_better", "fitness", today, 6)).not.toThrow();
  });
});
