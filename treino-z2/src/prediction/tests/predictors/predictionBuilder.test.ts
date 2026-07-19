import { describe, expect, it } from "vitest";
import { DEFAULT_TTL_DAYS_BY_CATEGORY, buildPrediction } from "../../predictors/shared/predictionBuilder";
import type { ModelOutput } from "../../models/predictionModel";

function modelOutput(overrides: Partial<ModelOutput<number>> = {}): ModelOutput<number> {
  return { value: 42, confidence: 0.75, lowerBound: 30, upperBound: 54, assumptions: ["assumes X"], missingInputs: [], ...overrides };
}

describe("buildPrediction", () => {
  it("derives id from kind, generatedAt's date and (absent) idSuffix", () => {
    const prediction = buildPrediction({
      kind: "race_fiveK",
      predictionType: "race_time_5k",
      category: "race",
      modelOutput: modelOutput(),
      supportingMetrics: ["best_effort"],
      generatedAt: "2026-07-18T10:00:00.000Z",
    });
    expect(prediction.id).toBe("prediction:race_fiveK:2026-07-18");
  });

  it("folds idSuffix into id when provided, so two subjects of the same kind/date don't collide", () => {
    const prediction = buildPrediction({
      kind: "goal_achievement",
      predictionType: "goal_achievement",
      category: "goal",
      modelOutput: modelOutput(),
      supportingMetrics: [],
      generatedAt: "2026-07-18T10:00:00.000Z",
      idSuffix: "goal-1",
    });
    expect(prediction.id).toBe("prediction:goal_achievement:2026-07-18:goal-1");
  });

  it("computes expiresAt from generatedAt plus the category's default TTL", () => {
    const prediction = buildPrediction({
      kind: "recovery_time",
      predictionType: "recovery_time",
      category: "recovery",
      modelOutput: modelOutput(),
      supportingMetrics: ["ctl", "atl"],
      generatedAt: "2026-07-18T10:00:00.000Z",
    });
    const expectedExpiry = new Date(new Date("2026-07-18T10:00:00.000Z").getTime() + DEFAULT_TTL_DAYS_BY_CATEGORY.recovery * 86400000).toISOString();
    expect(prediction.expiresAt).toBe(expectedExpiry);
  });

  it("honors ttlDaysOverride instead of the category default when provided", () => {
    const prediction = buildPrediction({
      kind: "race_fiveK",
      predictionType: "race_time_5k",
      category: "race",
      modelOutput: modelOutput(),
      supportingMetrics: [],
      generatedAt: "2026-07-18T10:00:00.000Z",
      ttlDaysOverride: 3,
    });
    const expectedExpiry = new Date(new Date("2026-07-18T10:00:00.000Z").getTime() + 3 * 86400000).toISOString();
    expect(prediction.expiresAt).toBe(expectedExpiry);
  });

  it("clamps confidence into [0, 1]", () => {
    expect(buildPrediction({ kind: "k", predictionType: "ctl_evolution", category: "fitness", modelOutput: modelOutput({ confidence: 1.5 }), supportingMetrics: [], generatedAt: "2026-07-18T00:00:00.000Z" }).confidence).toBe(1);
    expect(buildPrediction({ kind: "k", predictionType: "ctl_evolution", category: "fitness", modelOutput: modelOutput({ confidence: -0.5 }), supportingMetrics: [], generatedAt: "2026-07-18T00:00:00.000Z" }).confidence).toBe(0);
  });

  it("folds missingInputs into assumptions with an explanatory prefix", () => {
    const prediction = buildPrediction({
      kind: "k",
      predictionType: "ctl_evolution",
      category: "fitness",
      modelOutput: modelOutput({ assumptions: ["assumes X"], missingInputs: ["not enough data"] }),
      supportingMetrics: [],
      generatedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(prediction.assumptions).toEqual(["assumes X", "missing/limited input: not enough data"]);
  });

  it("defaults supportingInsights to an empty array when not provided", () => {
    const prediction = buildPrediction({ kind: "k", predictionType: "ctl_evolution", category: "fitness", modelOutput: modelOutput(), supportingMetrics: [], generatedAt: "2026-07-18T00:00:00.000Z" });
    expect(prediction.supportingInsights).toEqual([]);
  });

  it("passes through supportingInsights, supportingMetrics, value, lowerBound and upperBound verbatim", () => {
    const prediction = buildPrediction({
      kind: "k",
      predictionType: "ctl_evolution",
      category: "fitness",
      modelOutput: modelOutput(),
      supportingMetrics: ["ctl"],
      supportingInsights: ["insight:trend_ctl_improving:2026-07-18"],
      generatedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(prediction.supportingMetrics).toEqual(["ctl"]);
    expect(prediction.supportingInsights).toEqual(["insight:trend_ctl_improving:2026-07-18"]);
    expect(prediction.value).toBe(42);
    expect(prediction.lowerBound).toBe(30);
    expect(prediction.upperBound).toBe(54);
  });
});
