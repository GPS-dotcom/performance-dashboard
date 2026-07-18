import { afterEach, describe, expect, it, vi } from "vitest";
import type { Insight } from "../../types/insight";

const fetchRecentInsights = vi.fn<(athleteId: string, limit: number) => Promise<Insight[]>>();
const saveInsight = vi.fn<(athleteId: string, insight: Insight) => Promise<{ id: string } | null>>();

vi.mock("../../repositories/insightRepository", () => ({
  fetchRecentInsights: (athleteId: string, limit: number) => fetchRecentInsights(athleteId, limit),
  saveInsight: (athleteId: string, insight: Insight) => saveInsight(athleteId, insight),
}));

const { getInsightHistory, persistInsights } = await import("../../services/intelligenceService");

function makeInsight(id: string): Insight {
  return {
    id,
    category: "fitness",
    priority: 6,
    title: "Test",
    description: "Test description.",
    evidence: [],
    confidence: 0.8,
    confidenceLevel: "high",
    relatedMetrics: ["ctl"],
    date: "2026-07-18",
    severity: "information",
    relatedRecommendations: [],
  };
}

afterEach(() => {
  fetchRecentInsights.mockReset();
  saveInsight.mockReset();
});

describe("persistInsights", () => {
  it("saves every insight and returns the count that succeeded", async () => {
    saveInsight.mockResolvedValue({ id: "row-1" });
    const insights = [makeInsight("a"), makeInsight("b"), makeInsight("c")];

    const count = await persistInsights("athlete-1", insights);

    expect(count).toBe(3);
    expect(saveInsight).toHaveBeenCalledTimes(3);
    expect(saveInsight).toHaveBeenNthCalledWith(1, "athlete-1", insights[0]);
  });

  it("does not count insights whose save failed", async () => {
    saveInsight.mockResolvedValueOnce({ id: "row-1" }).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "row-3" });
    const insights = [makeInsight("a"), makeInsight("b"), makeInsight("c")];

    const count = await persistInsights("athlete-1", insights);

    expect(count).toBe(2);
  });

  it("returns 0 for an empty insight list without calling the repository", async () => {
    const count = await persistInsights("athlete-1", []);
    expect(count).toBe(0);
    expect(saveInsight).not.toHaveBeenCalled();
  });
});

describe("getInsightHistory", () => {
  it("delegates to fetchRecentInsights with the given limit", async () => {
    fetchRecentInsights.mockResolvedValue([makeInsight("a")]);
    const result = await getInsightHistory("athlete-1", 20);
    expect(fetchRecentInsights).toHaveBeenCalledWith("athlete-1", 20);
    expect(result).toEqual([makeInsight("a")]);
  });

  it("defaults the limit to 50 when not provided", async () => {
    fetchRecentInsights.mockResolvedValue([]);
    await getInsightHistory("athlete-1");
    expect(fetchRecentInsights).toHaveBeenCalledWith("athlete-1", 50);
  });
});
