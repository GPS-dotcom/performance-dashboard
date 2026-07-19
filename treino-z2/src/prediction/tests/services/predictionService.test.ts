import { afterEach, describe, expect, it, vi } from "vitest";
import type { Prediction } from "../../types/prediction";

const fetchRecentPredictions = vi.fn<(athleteId: string, limit: number) => Promise<Prediction<unknown>[]>>();
const savePrediction = vi.fn<(athleteId: string, prediction: Prediction<unknown>) => Promise<{ id: string } | null>>();

vi.mock("../../repositories/predictionRepository", () => ({
  fetchRecentPredictions: (athleteId: string, limit: number) => fetchRecentPredictions(athleteId, limit),
  savePrediction: (athleteId: string, prediction: Prediction<unknown>) => savePrediction(athleteId, prediction),
}));

const { getPredictionHistory, persistPredictions } = await import("../../services/predictionService");

function makePrediction(id: string): Prediction<unknown> {
  return {
    id,
    predictionType: "recovery_time",
    category: "recovery",
    value: 5,
    confidence: 0.65,
    lowerBound: 4,
    upperBound: 6,
    supportingMetrics: ["ctl", "atl"],
    supportingInsights: [],
    assumptions: [],
    generatedAt: "2026-07-18T10:00:00.000Z",
    expiresAt: "2026-07-19T10:00:00.000Z",
  };
}

afterEach(() => {
  fetchRecentPredictions.mockReset();
  savePrediction.mockReset();
});

describe("persistPredictions", () => {
  it("saves every prediction and returns the count that succeeded", async () => {
    savePrediction.mockResolvedValue({ id: "row-1" });
    const predictions = [makePrediction("a"), makePrediction("b"), makePrediction("c")];

    const count = await persistPredictions("athlete-1", predictions);

    expect(count).toBe(3);
    expect(savePrediction).toHaveBeenCalledTimes(3);
    expect(savePrediction).toHaveBeenNthCalledWith(1, "athlete-1", predictions[0]);
  });

  it("does not count predictions whose save failed", async () => {
    savePrediction.mockResolvedValueOnce({ id: "row-1" }).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "row-3" });
    const predictions = [makePrediction("a"), makePrediction("b"), makePrediction("c")];

    const count = await persistPredictions("athlete-1", predictions);

    expect(count).toBe(2);
  });

  it("returns 0 for an empty prediction list without calling the repository", async () => {
    const count = await persistPredictions("athlete-1", []);
    expect(count).toBe(0);
    expect(savePrediction).not.toHaveBeenCalled();
  });
});

describe("getPredictionHistory", () => {
  it("delegates to fetchRecentPredictions with the given limit", async () => {
    fetchRecentPredictions.mockResolvedValue([makePrediction("a")]);
    const result = await getPredictionHistory("athlete-1", 20);
    expect(fetchRecentPredictions).toHaveBeenCalledWith("athlete-1", 20);
    expect(result).toEqual([makePrediction("a")]);
  });

  it("defaults the limit to 50 when not provided", async () => {
    fetchRecentPredictions.mockResolvedValue([]);
    await getPredictionHistory("athlete-1");
    expect(fetchRecentPredictions).toHaveBeenCalledWith("athlete-1", 50);
  });
});
