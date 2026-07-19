import { describe, expect, it } from "vitest";
import { predictAccumulatedFatigueRisk, predictAcuteLoadRisk, predictMonotonyRisk } from "../../predictors/injuryRiskPredictor";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

const today = "2026-07-18";

function tsbSeries(values: number[], startDate = "2026-07-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("predictAcuteLoadRisk", () => {
  it("reports category injury_risk, predictionType injury_risk_acute_load and supportingMetrics [ctl, atl]", () => {
    const prediction = predictAcuteLoadRisk(50, 100, today);
    expect(prediction.category).toBe("injury_risk");
    expect(prediction.predictionType).toBe("injury_risk_acute_load");
    expect(prediction.supportingMetrics).toEqual(["ctl", "atl"]);
    expect(prediction.value!.riskLevel).toBe("high");
    expect(prediction.value!.acwr).toBeCloseTo(2, 5);
  });
});

describe("predictMonotonyRisk", () => {
  it("reports predictionType injury_risk_monotony and supportingMetrics [daily_training_load]", () => {
    const prediction = predictMonotonyRisk([50, 50, 50, 50, 50, 50, 50], today);
    expect(prediction.predictionType).toBe("injury_risk_monotony");
    expect(prediction.supportingMetrics).toEqual(["daily_training_load"]);
    expect(prediction.value!.riskLevel).toBe("high");
  });
});

describe("predictAccumulatedFatigueRisk", () => {
  it("reports predictionType injury_risk_accumulated_fatigue and supportingMetrics [tsb]", () => {
    const prediction = predictAccumulatedFatigueRisk(tsbSeries([-5, -3, 0, 2, 5]), today);
    expect(prediction.predictionType).toBe("injury_risk_accumulated_fatigue");
    expect(prediction.supportingMetrics).toEqual(["tsb"]);
    expect(prediction.value!.riskLevel).toBe("low");
  });
});
