import { fetchRecentInsights, saveInsight } from "../repositories/insightRepository";
import type { Insight } from "../types/insight";

/**
 * Orchestration entry point: persists a batch of already-generated
 * insights (from any combination of analyzers/detectors) and reports how
 * many succeeded. Each analyzer/detector stays a pure function that
 * returns Insight | Insight[] | null -- callers (e.g.
 * hooks/assembleDailyBrief.ts) decide which analyzers to run over which
 * data, then hand the results here to persist.
 */
export async function persistInsights(athleteId: string, insights: Insight[]): Promise<number> {
  let savedCount = 0;
  for (const insight of insights) {
    const result = await saveInsight(athleteId, insight);
    if (result) savedCount++;
  }
  return savedCount;
}

/** Reads back an athlete's most recent insights, already sorted by recency (see insightRepository). */
export async function getInsightHistory(athleteId: string, limit = 50): Promise<Insight[]> {
  return fetchRecentInsights(athleteId, limit);
}
