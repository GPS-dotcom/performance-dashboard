import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchRecentPredictions, savePrediction } = await import("../../repositories/predictionRepository");
const { buildPrediction } = await import("../../predictors/shared/predictionBuilder");

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

function makeNumericPrediction() {
  return buildPrediction({
    kind: "recovery_time",
    predictionType: "recovery_time",
    category: "recovery",
    modelOutput: { value: 5, confidence: 0.65, lowerBound: 4, upperBound: 6, assumptions: ["assumes rest"], missingInputs: [] },
    supportingMetrics: ["ctl", "atl"],
    generatedAt: "2026-07-18T10:00:00.000Z",
  });
}

function makeStructuredPrediction() {
  return buildPrediction({
    kind: "race_fiveK",
    predictionType: "race_time_5k",
    category: "race",
    modelOutput: {
      value: { predictedTimeSec: 1200, method: "actual_best_effort", anchorDistanceKm: 5, anchorTimeSec: 1200 },
      confidence: 0.95,
      lowerBound: 1140,
      upperBound: 1260,
      assumptions: [],
      missingInputs: [],
    },
    supportingMetrics: ["best_effort"],
    generatedAt: "2026-07-18T10:00:00.000Z",
  });
}

describe("savePrediction", () => {
  it("upserts onto the predictions table keyed by (athlete_id, client_prediction_id)", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "row-1" }, error: null }));
    const result = await savePrediction("athlete-1", makeNumericPrediction());
    expect(fromMock).toHaveBeenCalledWith("predictions");
    expect(result).toEqual({ id: "row-1" });
  });

  it("populates predicted_value/unit only when value is a bare number", async () => {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = { upsert: upsertSpy, select: () => handler, single: async () => ({ data: { id: "row-1" }, error: null }) };
    fromMock.mockImplementationOnce(() => handler);

    await savePrediction("athlete-1", makeNumericPrediction());

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload.predicted_value).toBe(5);
    expect(payload.value_json).toBe(5);
  });

  it("leaves predicted_value null and stores the full object in value_json for structured values", async () => {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = { upsert: upsertSpy, select: () => handler, single: async () => ({ data: { id: "row-1" }, error: null }) };
    fromMock.mockImplementationOnce(() => handler);

    await savePrediction("athlete-1", makeStructuredPrediction());

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload.predicted_value).toBeNull();
    expect(payload.value_json).toEqual({ predictedTimeSec: 1200, method: "actual_best_effort", anchorDistanceKm: 5, anchorTimeSec: 1200 });
  });

  it("writes the legacy kind column from predictionType, plus category/confidence/bounds/assumptions/expiry", async () => {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = { upsert: upsertSpy, select: () => handler, single: async () => ({ data: { id: "row-1" }, error: null }) };
    fromMock.mockImplementationOnce(() => handler);

    const prediction = makeNumericPrediction();
    await savePrediction("athlete-1", prediction);

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload.kind).toBe("recovery_time");
    expect(payload.category).toBe("recovery");
    expect(payload.confidence).toBe(prediction.confidence);
    expect(payload.lower_bound).toBe(prediction.lowerBound);
    expect(payload.upper_bound).toBe(prediction.upperBound);
    expect(payload.assumptions).toEqual(prediction.assumptions);
    expect(payload.expires_at).toBe(prediction.expiresAt);
    expect(payload.client_prediction_id).toBe(prediction.id);
  });

  it("returns null and logs instead of throwing when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "conflict" } }));

    const result = await savePrediction("athlete-1", makeNumericPrediction());

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("fetchRecentPredictions", () => {
  it("maps stored rows back into Prediction objects", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_prediction_id: "prediction:recovery_time:2026-07-18",
            kind: "recovery_time",
            category: "recovery",
            confidence: 0.65,
            lower_bound: 4,
            upper_bound: 6,
            assumptions: ["assumes rest"],
            supporting_insights: [],
            value_json: { daysUntilRecovered: 5, assumedDailyTss: 0 },
            source_metrics: ["ctl", "atl"],
            expires_at: "2026-07-19T10:00:00.000Z",
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const result = await fetchRecentPredictions("athlete-1", 10);

    expect(fromMock).toHaveBeenCalledWith("predictions");
    expect(result).toEqual([
      {
        id: "prediction:recovery_time:2026-07-18",
        predictionType: "recovery_time",
        category: "recovery",
        value: { daysUntilRecovered: 5, assumedDailyTss: 0 },
        confidence: 0.65,
        lowerBound: 4,
        upperBound: 6,
        supportingMetrics: ["ctl", "atl"],
        supportingInsights: [],
        assumptions: ["assumes rest"],
        generatedAt: "2026-07-18T10:00:00.000Z",
        expiresAt: "2026-07-19T10:00:00.000Z",
      },
    ]);
  });

  it("falls back to defaults when nullable columns come back null", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_prediction_id: null,
            kind: "recovery_time",
            category: null,
            confidence: 0.5,
            lower_bound: null,
            upper_bound: null,
            assumptions: null,
            supporting_insights: null,
            value_json: null,
            source_metrics: null,
            expires_at: null,
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const [result] = await fetchRecentPredictions("athlete-1", 10);
    expect(result.id).toBe("");
    expect(result.category).toBe("fitness");
    expect(result.value).toBeNull();
    expect(result.assumptions).toEqual([]);
    expect(result.supportingInsights).toEqual([]);
    expect(result.supportingMetrics).toEqual([]);
    expect(result.expiresAt).toBe("2026-07-18T10:00:00.000Z"); // falls back to created_at
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchRecentPredictions("athlete-1", 10)).rejects.toThrow("timeout");
  });
});
