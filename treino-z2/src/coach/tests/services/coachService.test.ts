import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alert } from "../../types/alert";
import type { Recommendation } from "../../types/recommendation";

const fetchRecentRecommendations = vi.fn<(athleteId: string, limit: number) => Promise<Recommendation[]>>();
const saveRecommendation = vi.fn<(athleteId: string, recommendation: Recommendation) => Promise<{ id: string } | null>>();
const fetchRecentAlerts = vi.fn<(athleteId: string, limit: number) => Promise<Alert[]>>();
const saveAlert = vi.fn<(athleteId: string, alert: Alert) => Promise<{ id: string } | null>>();

vi.mock("../../repositories/recommendationRepository", () => ({
  fetchRecentRecommendations: (athleteId: string, limit: number) => fetchRecentRecommendations(athleteId, limit),
  saveRecommendation: (athleteId: string, recommendation: Recommendation) => saveRecommendation(athleteId, recommendation),
}));
vi.mock("../../repositories/alertRepository", () => ({
  fetchRecentAlerts: (athleteId: string, limit: number) => fetchRecentAlerts(athleteId, limit),
  saveAlert: (athleteId: string, alert: Alert) => saveAlert(athleteId, alert),
}));

const { getAlertHistory, getRecommendationHistory, persistAlerts, persistRecommendations } = await import("../../services/coachService");

function makeRecommendation(id: string): Recommendation {
  return {
    id,
    type: "intensity",
    priority: 3,
    title: "Easy Run",
    description: "d",
    reasoning: "r",
    supportingMetrics: [],
    supportingInsights: [],
    supportingPredictions: [],
    confidence: 0.7,
    createdAt: "2026-07-18T10:00:00.000Z",
  };
}

function makeAlert(id: string): Alert {
  return { id, severity: "warning", category: "elevated_fatigue", title: "t", description: "d", actionRequired: null, generatedAt: "2026-07-18" };
}

afterEach(() => {
  fetchRecentRecommendations.mockReset();
  saveRecommendation.mockReset();
  fetchRecentAlerts.mockReset();
  saveAlert.mockReset();
});

describe("persistRecommendations", () => {
  it("saves every recommendation and returns the count that succeeded", async () => {
    saveRecommendation.mockResolvedValue({ id: "row-1" });
    const recommendations = [makeRecommendation("a"), makeRecommendation("b")];
    const count = await persistRecommendations("athlete-1", recommendations);
    expect(count).toBe(2);
    expect(saveRecommendation).toHaveBeenCalledTimes(2);
  });

  it("does not count recommendations whose save failed", async () => {
    saveRecommendation.mockResolvedValueOnce({ id: "row-1" }).mockResolvedValueOnce(null);
    const count = await persistRecommendations("athlete-1", [makeRecommendation("a"), makeRecommendation("b")]);
    expect(count).toBe(1);
  });
});

describe("persistAlerts", () => {
  it("saves every alert and returns the count that succeeded", async () => {
    saveAlert.mockResolvedValue({ id: "row-1" });
    const count = await persistAlerts("athlete-1", [makeAlert("a"), makeAlert("b")]);
    expect(count).toBe(2);
  });

  it("returns 0 for an empty alert list without calling the repository", async () => {
    const count = await persistAlerts("athlete-1", []);
    expect(count).toBe(0);
    expect(saveAlert).not.toHaveBeenCalled();
  });
});

describe("getRecommendationHistory", () => {
  it("delegates to fetchRecentRecommendations with the given limit, defaulting to 50", async () => {
    fetchRecentRecommendations.mockResolvedValue([]);
    await getRecommendationHistory("athlete-1");
    expect(fetchRecentRecommendations).toHaveBeenCalledWith("athlete-1", 50);

    await getRecommendationHistory("athlete-1", 20);
    expect(fetchRecentRecommendations).toHaveBeenCalledWith("athlete-1", 20);
  });
});

describe("getAlertHistory", () => {
  it("delegates to fetchRecentAlerts with the given limit, defaulting to 50", async () => {
    fetchRecentAlerts.mockResolvedValue([]);
    await getAlertHistory("athlete-1");
    expect(fetchRecentAlerts).toHaveBeenCalledWith("athlete-1", 50);
  });
});
