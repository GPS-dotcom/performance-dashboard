import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchRecentRecommendations, saveRecommendation } = await import("../../repositories/recommendationRepository");
const { RecommendationFactory } = await import("../../recommendations/recommendationFactory");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    order: () => handler,
    limit: () => handler,
    upsert: () => handler,
    single: async () => result,
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

function makeRecommendation() {
  return RecommendationFactory.create({
    type: "intensity",
    kind: "easy_run",
    priority: 3,
    title: "Easy Run",
    description: "An easy-effort aerobic session.",
    reasoning: "Recovery is moderate.",
    supportingMetrics: ["recovery_score"],
    confidence: 0.7,
    createdAt: "2026-07-18T10:00:00.000Z",
  });
}

describe("saveRecommendation", () => {
  it("upserts onto the recommendations table keyed by (athlete_id, client_recommendation_id)", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "row-1" }, error: null }));
    const result = await saveRecommendation("athlete-1", makeRecommendation());
    expect(fromMock).toHaveBeenCalledWith("recommendations");
    expect(result).toEqual({ id: "row-1" });
  });

  it("populates the legacy kind/recommendation/reason/confidence columns for backward compatibility", async () => {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = { upsert: upsertSpy, select: () => handler, single: async () => ({ data: { id: "row-1" }, error: null }) };
    fromMock.mockImplementationOnce(() => handler);

    const recommendation = makeRecommendation();
    await saveRecommendation("athlete-1", recommendation);

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload.kind).toBe("intensity");
    expect(payload.recommendation).toBe("Easy Run");
    expect(payload.reason).toBe("Recovery is moderate.");
    expect(payload.confidence).toBe(0.7);
    expect(payload.client_recommendation_id).toBe(recommendation.id);
  });

  it("returns null and logs instead of throwing when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "conflict" } }));

    const result = await saveRecommendation("athlete-1", makeRecommendation());

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("fetchRecentRecommendations", () => {
  it("maps stored rows back into Recommendation objects", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_recommendation_id: "recommendation:easy_run:2026-07-18",
            type: "intensity",
            priority: 3,
            title: "Easy Run",
            description: "An easy-effort aerobic session.",
            reasoning: "Recovery is moderate.",
            supporting_metrics: ["recovery_score"],
            supporting_insights: [],
            supporting_predictions: [],
            confidence: 0.7,
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const result = await fetchRecentRecommendations("athlete-1", 10);

    expect(fromMock).toHaveBeenCalledWith("recommendations");
    expect(result).toEqual([
      {
        id: "recommendation:easy_run:2026-07-18",
        type: "intensity",
        priority: 3,
        title: "Easy Run",
        description: "An easy-effort aerobic session.",
        reasoning: "Recovery is moderate.",
        supportingMetrics: ["recovery_score"],
        supportingInsights: [],
        supportingPredictions: [],
        confidence: 0.7,
        createdAt: "2026-07-18T10:00:00.000Z",
      },
    ]);
  });

  it("falls back to defaults when nullable columns come back null", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_recommendation_id: null,
            type: null,
            priority: null,
            title: null,
            description: null,
            reasoning: null,
            supporting_metrics: null,
            supporting_insights: null,
            supporting_predictions: null,
            confidence: 0.5,
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const [result] = await fetchRecentRecommendations("athlete-1", 10);
    expect(result.id).toBe("");
    expect(result.type).toBe("intensity");
    expect(result.priority).toBe(3);
    expect(result.supportingMetrics).toEqual([]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchRecentRecommendations("athlete-1", 10)).rejects.toThrow("timeout");
  });
});
