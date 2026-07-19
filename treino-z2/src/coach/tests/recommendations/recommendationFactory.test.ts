import { describe, expect, it } from "vitest";
import { RecommendationFactory } from "../../recommendations/recommendationFactory";

function baseParams() {
  return {
    type: "intensity" as const,
    kind: "easy_run",
    priority: 3 as const,
    title: "Easy Run",
    description: "An easy-effort aerobic session.",
    reasoning: "Recovery is moderate.",
    supportingMetrics: ["recovery_score"],
    confidence: 0.7,
    createdAt: "2026-07-18T10:00:00.000Z",
  };
}

describe("RecommendationFactory.create", () => {
  it("derives id from kind, createdAt's date and (absent) idSuffix", () => {
    const recommendation = RecommendationFactory.create(baseParams());
    expect(recommendation.id).toBe("recommendation:easy_run:2026-07-18");
  });

  it("folds idSuffix into id when provided", () => {
    const recommendation = RecommendationFactory.create({ ...baseParams(), idSuffix: "5km" });
    expect(recommendation.id).toBe("recommendation:easy_run:2026-07-18:5km");
  });

  it("clamps confidence into [0, 1]", () => {
    expect(RecommendationFactory.create({ ...baseParams(), confidence: 1.5 }).confidence).toBe(1);
    expect(RecommendationFactory.create({ ...baseParams(), confidence: -0.5 }).confidence).toBe(0);
  });

  it("defaults supportingInsights/supportingPredictions to empty arrays when not provided", () => {
    const recommendation = RecommendationFactory.create(baseParams());
    expect(recommendation.supportingInsights).toEqual([]);
    expect(recommendation.supportingPredictions).toEqual([]);
  });

  it("passes through type/priority/title/description/reasoning/supportingMetrics/createdAt verbatim", () => {
    const params = baseParams();
    const recommendation = RecommendationFactory.create(params);
    expect(recommendation.type).toBe(params.type);
    expect(recommendation.priority).toBe(params.priority);
    expect(recommendation.title).toBe(params.title);
    expect(recommendation.description).toBe(params.description);
    expect(recommendation.reasoning).toBe(params.reasoning);
    expect(recommendation.supportingMetrics).toEqual(params.supportingMetrics);
    expect(recommendation.createdAt).toBe(params.createdAt);
  });
});
