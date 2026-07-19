import { describe, expect, it } from "vitest";
import { predictCriticalPowerEvolution, predictFtpEvolution, predictLt1Evolution, predictLt2Evolution } from "../../predictors/thresholdPredictor";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

const rising = series([200, 205, 210, 215, 220, 225]);
const today = "2026-06-10";

describe("threshold predictors", () => {
  it.each([
    ["predictLt1Evolution", predictLt1Evolution, "lt1_evolution", "lt1"],
    ["predictLt2Evolution", predictLt2Evolution, "lt2_evolution", "lt2"],
    ["predictCriticalPowerEvolution", predictCriticalPowerEvolution, "critical_power_evolution", "critical_power"],
    ["predictFtpEvolution", predictFtpEvolution, "ftp_evolution", "ftp"],
  ] as const)("%s reports predictionType %s and category threshold", (_name, fn, expectedType, expectedMetric) => {
    const prediction = fn(rising, 7, today);
    expect(prediction.predictionType).toBe(expectedType);
    expect(prediction.category).toBe("threshold");
    expect(prediction.supportingMetrics).toEqual([expectedMetric]);
    expect(prediction.value).not.toBeNull();
  });
});
