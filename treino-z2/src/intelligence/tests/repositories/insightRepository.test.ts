import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchRecentInsights, saveInsight } = await import("../../repositories/insightRepository");
const { buildInsight } = await import("../../insights/insightBuilder");

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

describe("saveInsight", () => {
  it("upserts onto the insights table keyed by (athlete_id, client_insight_id)", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "row-1" }, error: null }));

    const insight = buildInsight({
      kind: "trend_ctl_improving",
      category: "fitness",
      severity: "information",
      title: "Fitness Improving",
      description: "CTL is improving.",
      evidence: ["ev"],
      confidence: 0.8,
      relatedMetrics: ["ctl"],
      date: "2026-07-18",
    });

    const result = await saveInsight("athlete-1", insight);

    expect(fromMock).toHaveBeenCalledWith("insights");
    expect(result).toEqual({ id: "row-1" });
  });

  function chainCapturingUpsert() {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = {
      upsert: upsertSpy,
      select: () => handler,
      single: async () => ({ data: { id: "row-1" }, error: null }),
    };
    return { handler, upsertSpy };
  }

  it("maps severity 'positive' to the DB's 'info' value (no 'positive' check-constraint value exists)", async () => {
    const { handler, upsertSpy } = chainCapturingUpsert();
    fromMock.mockImplementationOnce(() => handler);

    const insight = buildInsight({
      kind: "consistency_frequency_excellent",
      category: "consistency",
      severity: "positive",
      title: "Excellent Training Consistency",
      description: "Great job.",
      evidence: [],
      confidence: 0.9,
      relatedMetrics: [],
      date: "2026-07-18",
    });

    await saveInsight("athlete-1", insight);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy.mock.calls[0][0].severity).toBe("info");
  });

  it("maps severity 'information' to the DB's 'info' value", async () => {
    const { handler, upsertSpy } = chainCapturingUpsert();
    fromMock.mockImplementationOnce(() => handler);

    const insight = buildInsight({
      kind: "trend_ctl_stable",
      category: "fitness",
      severity: "information",
      title: "Fitness Stable",
      description: "No change.",
      evidence: [],
      confidence: 0.5,
      relatedMetrics: [],
      date: "2026-07-18",
    });

    await saveInsight("athlete-1", insight);
    expect(upsertSpy.mock.calls[0][0].severity).toBe("info");
  });

  it("passes 'warning'/'critical' severities through unchanged", async () => {
    const { handler, upsertSpy } = chainCapturingUpsert();
    fromMock.mockImplementationOnce(() => handler);

    const insight = buildInsight({
      kind: "fatigue_accumulated",
      category: "recovery",
      severity: "critical",
      title: "Accumulated Fatigue",
      description: "TSB critically low.",
      evidence: [],
      confidence: 0.9,
      relatedMetrics: ["tsb"],
      date: "2026-07-18",
    });

    await saveInsight("athlete-1", insight);
    expect(upsertSpy.mock.calls[0][0].severity).toBe("critical");
  });

  it("returns null and logs instead of throwing when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "conflict" } }));

    const insight = buildInsight({
      kind: "trend_ctl_improving",
      category: "fitness",
      severity: "information",
      title: "Fitness Improving",
      description: "CTL is improving.",
      evidence: [],
      confidence: 0.8,
      relatedMetrics: ["ctl"],
      date: "2026-07-18",
    });

    const result = await saveInsight("athlete-1", insight);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("fetchRecentInsights", () => {
  it("maps stored rows back into Insight objects, deriving confidenceLevel from confidence", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_insight_id: "insight:trend_ctl_improving:2026-07-18",
            title: "Fitness Improving",
            category: "fitness",
            priority: 6,
            confidence: 0.9,
            severity: "info",
            explanation: "CTL is improving.",
            evidence: ["ev"],
            source_metrics: ["ctl"],
            created_at: "2026-07-18T10:00:00Z",
          },
        ],
        error: null,
      }),
    );

    const result = await fetchRecentInsights("athlete-1", 10);

    expect(fromMock).toHaveBeenCalledWith("insights");
    expect(result).toEqual([
      {
        id: "insight:trend_ctl_improving:2026-07-18",
        category: "fitness",
        priority: 6,
        title: "Fitness Improving",
        description: "CTL is improving.",
        evidence: ["ev"],
        confidence: 0.9,
        confidenceLevel: "very_high",
        relatedMetrics: ["ctl"],
        date: "2026-07-18",
        severity: "information",
        relatedRecommendations: [],
      },
    ]);
  });

  it("passes through 'warning'/'critical' severities unchanged when reading back", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_insight_id: "insight:fatigue_accumulated:2026-07-18",
            title: "Accumulated Fatigue",
            category: "recovery",
            priority: 3,
            confidence: 0.7,
            severity: "warning",
            explanation: "TSB is low.",
            evidence: null,
            source_metrics: null,
            created_at: "2026-07-18T10:00:00Z",
          },
        ],
        error: null,
      }),
    );

    const [result] = await fetchRecentInsights("athlete-1", 10);
    expect(result.severity).toBe("warning");
    expect(result.evidence).toEqual([]);
    expect(result.relatedMetrics).toEqual([]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchRecentInsights("athlete-1", 10)).rejects.toThrow("timeout");
  });

  it("falls back to defaults when nullable columns come back null", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_insight_id: null,
            title: null,
            category: null,
            priority: null,
            confidence: 0.2,
            severity: "info",
            explanation: "Something happened.",
            evidence: null,
            source_metrics: null,
            created_at: "2026-07-18T10:00:00Z",
          },
        ],
        error: null,
      }),
    );

    const [result] = await fetchRecentInsights("athlete-1", 10);
    expect(result.id).toBe("");
    expect(result.title).toBe("");
    expect(result.category).toBe("fitness");
    expect(result.priority).toBe(6);
  });
});
