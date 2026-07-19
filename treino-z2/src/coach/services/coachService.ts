import { fetchRecentAlerts, saveAlert } from "../repositories/alertRepository";
import { fetchRecentRecommendations, saveRecommendation } from "../repositories/recommendationRepository";
import type { Alert } from "../types/alert";
import type { Recommendation } from "../types/recommendation";

/**
 * Orchestration entry point: persists a batch of already-generated
 * recommendations and alerts, reporting how many succeeded each. Every
 * generator in this engine stays a pure function -- callers (e.g.
 * hooks/assembleDailyBrief.ts) decide which generators to run over which
 * data, then hand the results here to persist. Mirrors the Intelligence/
 * Prediction Engines' own services.
 */
export async function persistRecommendations(athleteId: string, recommendations: Recommendation[]): Promise<number> {
  let savedCount = 0;
  for (const recommendation of recommendations) {
    const result = await saveRecommendation(athleteId, recommendation);
    if (result) savedCount++;
  }
  return savedCount;
}

export async function persistAlerts(athleteId: string, alerts: Alert[]): Promise<number> {
  let savedCount = 0;
  for (const alert of alerts) {
    const result = await saveAlert(athleteId, alert);
    if (result) savedCount++;
  }
  return savedCount;
}

/** Reads back an athlete's most recent recommendations, already sorted by recency. */
export async function getRecommendationHistory(athleteId: string, limit = 50): Promise<Recommendation[]> {
  return fetchRecentRecommendations(athleteId, limit);
}

/** Reads back an athlete's most recent alerts, already sorted by recency. */
export async function getAlertHistory(athleteId: string, limit = 50): Promise<Alert[]> {
  return fetchRecentAlerts(athleteId, limit);
}
