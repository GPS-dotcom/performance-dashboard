import { describe, expect, it } from "vitest";
import {
  predictCriticalPowerProjection,
  predictLT1Evolution,
  predictLT2Evolution,
  predictThresholdEvolution,
} from "../thresholdProjection";

function series(values: number[], startDate = "2026-06-01"): { date: string; value: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("predictThresholdEvolution", () => {
  // A perfect line: value = 50 + 0.5*day, 10 points, 1 day apart (history span = 9 days).
  const perfectLine = series(Array.from({ length: 10 }, (_, i) => 50 + 0.5 * i));

  it("projects forward using linear regression, matching a hand-computed value", () => {
    const result = predictThresholdEvolution("LT1", perfectLine, 5);
    expect(result.value!.slopePerDay).toBeCloseTo(0.5, 6);
    expect(result.value!.rSquared).toBeCloseTo(1, 6);
    expect(result.value!.projectedValue).toBeCloseTo(57, 6);
    expect(result.value!.projectedDate).toBe("2026-06-15"); // day 14 = 2026-06-01 + 14 days
    expect(result.confidence).toBeCloseTo(0.444444, 5);
    expect(result.dataQuality).toBe("medium");
  });

  it("confidence drops to 0 once the projection reaches beyond the available history span", () => {
    const result = predictThresholdEvolution("LT1", perfectLine, 10); // 10 days ahead > 9-day span
    expect(result.confidence).toBe(0);
    expect(result.dataQuality).toBe("low");
    expect(result.missingInputs).toContain("projecting further ahead than the available history span");
  });

  it("is unavailable with fewer than 4 points", () => {
    const result = predictThresholdEvolution("LT1", series([50, 51, 52]), 5);
    expect(result.value).toBeNull();
  });

  it("reaches high confidence when projecting a short distance from a long, well-fit history", () => {
    const longLine = series(Array.from({ length: 60 }, (_, i) => 50 + 0.5 * i)); // 59-day span
    const result = predictThresholdEvolution("LT1", longLine, 3);
    expect(result.dataQuality).toBe("high");
  });
});

describe("named threshold wrappers", () => {
  const perfectLine = series(Array.from({ length: 10 }, (_, i) => 50 + 0.5 * i));

  it("predictLT1Evolution labels the projection LT1", () => {
    expect(predictLT1Evolution(perfectLine, 5).value!.metricName).toBe("LT1");
  });

  it("predictLT2Evolution labels the projection LT2", () => {
    expect(predictLT2Evolution(perfectLine, 5).value!.metricName).toBe("LT2");
  });

  it("predictCriticalPowerProjection labels the projection Critical Power", () => {
    expect(predictCriticalPowerProjection(perfectLine, 5).value!.metricName).toBe("Critical Power");
  });
});
