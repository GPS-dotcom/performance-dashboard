import { describe, expect, it } from "vitest";
import { accumulatedFatigueRiskModel, predictAccumulatedFatigueRisk } from "../../algorithms/accumulatedFatigueRiskModel";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function tsbSeries(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("predictAccumulatedFatigueRisk", () => {
  it("returns an unavailable output with fewer than 5 days of TSB history", () => {
    const output = predictAccumulatedFatigueRisk({ tsbSeries: tsbSeries([-5, -10, -15]) });
    expect(output.value).toBeNull();
    expect(output.missingInputs).toEqual(["fewer than 5 days of TSB history"]);
  });

  it("reports low risk when the most recent day is above the sustained-fatigue threshold", () => {
    const output = predictAccumulatedFatigueRisk({ tsbSeries: tsbSeries([-5, -3, 0, 2, 5]) });
    expect(output.value!.riskLevel).toBe("low");
    expect(output.value!.riskScore).toBe(15);
    expect(output.confidence).toBe(0.4);
  });

  it("reports moderate risk for a shorter or shallower sustained dip", () => {
    const output = predictAccumulatedFatigueRisk({ tsbSeries: tsbSeries([-5, -10, -16, -17, -18]) });
    expect(output.value!.riskLevel).toBe("moderate");
    expect(output.value!.riskScore).toBe(46);
    expect(output.confidence).toBeCloseTo(0.55, 5);
  });

  it("reports high risk for a deep, sustained (>= 5 consecutive days) dip", () => {
    const output = predictAccumulatedFatigueRisk({ tsbSeries: tsbSeries([-30, -28, -27, -26, -25]) });
    expect(output.value!.riskLevel).toBe("high");
    expect(output.value!.riskScore).toBe(85);
    expect(output.confidence).toBeCloseTo(0.65, 5);
  });

  it("sorts unordered input by date before scanning for a consecutive streak", () => {
    const points = tsbSeries([-30, -28, -27, -26, -25]);
    const shuffled = [points[2], points[0], points[4], points[1], points[3]];
    const output = predictAccumulatedFatigueRisk({ tsbSeries: shuffled });
    expect(output.value!.riskLevel).toBe("high");
  });

  it("always flags the lack of HRV/sleep/wellness signals as a missing input", () => {
    const output = predictAccumulatedFatigueRisk({ tsbSeries: tsbSeries([-5, -3, 0, 2, 5]) });
    expect(output.missingInputs).toEqual(["additional signals (HRV, sleep, prior injury history, subjective wellness) would improve this estimate"]);
  });
});

describe("accumulatedFatigueRiskModel", () => {
  it("exposes a stable modelId and delegates to predictAccumulatedFatigueRisk", () => {
    expect(accumulatedFatigueRiskModel.modelId).toBe("sustained-tsb-injury-risk");
    expect(accumulatedFatigueRiskModel.predict({ tsbSeries: tsbSeries([-5, -3, 0, 2, 5]) }).value!.riskLevel).toBe("low");
  });
});
