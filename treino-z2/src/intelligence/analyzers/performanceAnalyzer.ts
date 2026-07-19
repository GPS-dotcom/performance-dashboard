import { buildInsight } from "../insights/insightBuilder";
import { newPersonalBestTemplate } from "../insights/insightTemplates";
import { MIN_EFFORTS_FOR_DISTANCE_EVOLUTION, PR_TIE_TOLERANCE_FRACTION } from "../rules/performanceRules";
import { analyzeTrend } from "./trendAnalyzer";
import type { Activity } from "../../types";
import type { Insight } from "../types/insight";
import type { MetricSeriesPoint } from "../types/metricSeries";

/**
 * Performance Analyzer (08_INTELLIGENCE_ENGINE.md: "Estimate ... Current
 * fitness ... Performance potential"). The only analyzer besides
 * consistencyAnalyzer/shoeAnalyzer that reads Activity[] directly
 * instead of a Metrics Engine series -- personal bests and per-distance
 * evolution are inherently about *sessions*, not a single derived
 * metric series.
 */

function sortedByDate(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** "recordes": walks best-effort history per distance key and reports the most recent activity that set a new all-time best. */
export function detectPersonalBests(activities: Activity[], date: string): Insight[] {
  const sorted = sortedByDate(activities);
  const bestSoFar = new Map<string, number>();
  const insights: Insight[] = [];

  for (const activity of sorted) {
    if (!activity.bestEfforts) continue;
    for (const [distanceKey, timeSec] of Object.entries(activity.bestEfforts)) {
      const previousBest = bestSoFar.get(distanceKey);
      const isNewBest = previousBest == null || timeSec < previousBest * (1 - PR_TIE_TOLERANCE_FRACTION);
      if (isNewBest) {
        // Only surface it as *the* insight for "today" if this activity is the one being evaluated.
        if (activity.startDate.slice(0, 10) === date) {
          const t = newPersonalBestTemplate(distanceKey, timeSec, previousBest ?? null);
          insights.push(
            buildInsight({
              kind: "performance_new_pr",
              category: "performance",
              severity: "positive",
              title: t.title,
              description: t.description,
              evidence: previousBest != null ? [`previous best at ${distanceKey}: ${previousBest.toFixed(0)}s`] : [`first recorded effort at ${distanceKey}`],
              confidence: 0.95,
              relatedMetrics: ["best_effort"],
              date,
              idSuffix: distanceKey,
            }),
          );
        }
        bestSoFar.set(distanceKey, timeSec);
      }
    }
  }

  return insights;
}

function seriesFromActivities(activities: Activity[], valueOf: (a: Activity) => number | null): MetricSeriesPoint[] {
  return sortedByDate(activities)
    .map((a) => ({ date: a.startDate.slice(0, 10), value: valueOf(a) }))
    .filter((p): p is MetricSeriesPoint => p.value != null);
}

/** "evolução por distância": trend of best-effort pace at one specific distance key over time. */
export function analyzeDistanceEvolution(activities: Activity[], distanceKey: string, date: string): Insight | null {
  const series = seriesFromActivities(activities, (a) => (a.bestEfforts?.[distanceKey] != null ? a.bestEfforts[distanceKey] : null));
  if (series.length < MIN_EFFORTS_FOR_DISTANCE_EVOLUTION) return null;
  // Lower time is faster -- lower_is_better.
  return analyzeTrend(`${distanceKey} Best Effort`, `best_effort_${distanceKey}`, series, "lower_is_better", "performance", date);
}

/** "evolução por potência": trend of per-session average power. */
export function analyzePowerPerformanceEvolution(activities: Activity[], date: string): Insight | null {
  const series = seriesFromActivities(activities, (a) => a.weightedAverageWatts ?? a.averageWatts);
  if (series.length < MIN_EFFORTS_FOR_DISTANCE_EVOLUTION) return null;
  return analyzeTrend("Session Power", "average_power", series, "higher_is_better", "performance", date);
}

/** "evolução por pace": trend of per-session pace (seconds/km, lower is faster). */
export function analyzePacePerformanceEvolution(activities: Activity[], date: string): Insight | null {
  const series = seriesFromActivities(activities, (a) =>
    a.distanceM && a.movingTimeS && a.distanceM > 0 ? a.movingTimeS / (a.distanceM / 1000) : null,
  );
  if (series.length < MIN_EFFORTS_FOR_DISTANCE_EVOLUTION) return null;
  return analyzeTrend("Session Pace", "average_pace", series, "lower_is_better", "performance", date);
}
