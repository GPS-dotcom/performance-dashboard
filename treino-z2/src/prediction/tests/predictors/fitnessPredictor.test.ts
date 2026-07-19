import { describe, expect, it } from "vitest";
import { predictCtlEvolution, predictFitnessScoreEvolution, predictRunningEffectivenessEvolution } from "../../predictors/fitnessPredictor";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

const rising = series([40, 44, 48, 52, 56, 60]);
const today = "2026-06-10";

describe("predictCtlEvolution", () => {
  it("reports category fitness, predictionType ctl_evolution and supportingMetrics [ctl]", () => {
    const prediction = predictCtlEvolution(rising, 7, today);
    expect(prediction.category).toBe("fitness");
    expect(prediction.predictionType).toBe("ctl_evolution");
    expect(prediction.supportingMetrics).toEqual(["ctl"]);
    expect(prediction.value).not.toBeNull();
  });
});

describe("predictFitnessScoreEvolution", () => {
  it("reports predictionType fitness_score_evolution and supportingMetrics [fitness_score]", () => {
    const prediction = predictFitnessScoreEvolution(rising, 7, today);
    expect(prediction.predictionType).toBe("fitness_score_evolution");
    expect(prediction.supportingMetrics).toEqual(["fitness_score"]);
  });
});

describe("predictRunningEffectivenessEvolution", () => {
  it("reports predictionType running_effectiveness_evolution and supportingMetrics [running_effectiveness]", () => {
    const prediction = predictRunningEffectivenessEvolution(rising, 7, today);
    expect(prediction.predictionType).toBe("running_effectiveness_evolution");
    expect(prediction.supportingMetrics).toEqual(["running_effectiveness"]);
  });

  it("returns a null value when there isn't enough history", () => {
    const prediction = predictRunningEffectivenessEvolution(series([1, 2]), 7, today);
    expect(prediction.value).toBeNull();
    expect(prediction.confidence).toBe(0);
  });
});
