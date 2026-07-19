import { analyzeTrainingLoadTrend, type TrainingLoadPoint } from "../analyzers/trainingLoadTrendAnalyzer";
import type { DailyTrainingLoad } from "../models/dailyTrainingLoad";
import { fetchMetricsSnapshotHistory, upsertMetricsSnapshot } from "../repositories/metricsSnapshotRepository";
import type { MetricResult } from "../types/metricResult";

/**
 * Orchestration entry point for Training Load: runs
 * analyzeTrainingLoadTrend over `dailyLoads`, then persists every
 * resulting day to `metrics_snapshots` via upsertMetricsSnapshot. This is
 * the only function in the engine that both calculates *and* writes --
 * every calculator/analyzer stays pure, and every other repository call
 * is a plain read.
 */
export async function computeAndPersistTrainingLoad(
  athleteId: string,
  dailyLoads: DailyTrainingLoad[],
): Promise<MetricResult<TrainingLoadPoint[]>> {
  const result = analyzeTrainingLoadTrend(dailyLoads);
  if (!result.value) return result;

  for (const point of result.value) {
    await upsertMetricsSnapshot(athleteId, point);
  }

  return result;
}

/** Reads back already-persisted CTL/ATL/TSB history, without recomputing anything. */
export async function getTrainingLoadHistory(athleteId: string, windowDays: number): Promise<TrainingLoadPoint[]> {
  return fetchMetricsSnapshotHistory(athleteId, windowDays);
}
