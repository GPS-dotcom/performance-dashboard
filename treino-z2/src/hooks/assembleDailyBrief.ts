import { calculateFitnessScore, calculateRecoveryScore } from "../engines/metrics";
import type { TrainingLoadPoint } from "../engines/metrics";
import { detectPlateau, detectTrend } from "../engines/intelligence";
import type { Insight, MetricPolarity, MetricSeriesPoint, TrendResult } from "../engines/intelligence";
import {
  predict10K,
  predict5K,
  predictHalfMarathon,
  predictInjuryRisk,
  predictMarathon,
  predictRecoveryTime,
} from "../engines/prediction";
import type { BestEffort, RacePrediction } from "../engines/prediction";
import { generateDailyBrief, recommendRecovery } from "../engines/coach";
import type { DailyBrief, Recommendation, TrendDirection } from "../engines/coach";
import type { MetricResult } from "../engines/metrics";
import type { Activity, MetricsSnapshot } from "../types";
import type { UpcomingGoal } from "../services/goalService";

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  kind: "activity" | "personal_record";
}

export interface DailyBriefViewModel {
  brief: DailyBrief;
  insights: Insight[];
  racePredictions: { label: string; result: MetricResult<RacePrediction> }[];
  recoveryTime: MetricResult<{ daysUntilRecovered: number; assumedRestTss: number }> | null;
  recoveryRecommendations: Recommendation[];
  trainingLoadHistory: TrainingLoadPoint[];
  timelineEvents: TimelineEvent[];
}

// Strava best-effort keys -> distance in km (same convention the legacy
// dashboard's realBestEfforts/BEST_EFFORT_DISTANCES already used).
const BEST_EFFORT_DISTANCES_KM: Record<string, number> = {
  "5k": 5,
  "10k": 10,
  "15k": 15,
  "10mile": 16.0934,
  "20k": 20,
  half_marathon: 21.0975,
};

function extractBestEfforts(activities: Activity[]): BestEffort[] {
  const bestByKey = new Map<string, number>();
  for (const activity of activities) {
    if (!activity.bestEfforts) continue;
    for (const [key, timeSec] of Object.entries(activity.bestEfforts)) {
      const distanceKm = BEST_EFFORT_DISTANCES_KM[key];
      if (distanceKm == null) continue;
      const current = bestByKey.get(key);
      if (current == null || timeSec < current) bestByKey.set(key, timeSec);
    }
  }
  return Array.from(bestByKey.entries()).map(([key, timeSec]) => ({ distanceKm: BEST_EFFORT_DISTANCES_KM[key], timeSec }));
}

function derivePrActivityIds(activities: Activity[]): Set<Activity["id"]> {
  const bestByKey = new Map<string, { activityId: Activity["id"]; timeSec: number }>();
  for (const activity of activities) {
    if (!activity.bestEfforts) continue;
    for (const [key, timeSec] of Object.entries(activity.bestEfforts)) {
      const current = bestByKey.get(key);
      if (!current || timeSec < current.timeSec) bestByKey.set(key, { activityId: activity.id, timeSec });
    }
  }
  return new Set(Array.from(bestByKey.values()).map((v) => v.activityId));
}

function deriveTimeline(activities: Activity[]): TimelineEvent[] {
  const prActivityIds = derivePrActivityIds(activities);
  return activities.slice(0, 20).map((activity) => ({
    date: activity.startDate.slice(0, 10),
    title: activity.name,
    description: activity.distanceM != null ? `${(activity.distanceM / 1000).toFixed(1)} km` : "",
    kind: prActivityIds.has(activity.id) ? "personal_record" : "activity",
  }));
}

/**
 * Raw direction (did the number go up or down?) rather than a
 * good/bad-judged one: always calls detectTrend with "higher_is_better"
 * polarity purely to get a slope sign, then relabels "improving"/
 * "declining" back to "increasing"/"decreasing" -- Coach Engine's
 * TrainingSignals wants the raw fact (e.g. "ATL increased"), since its
 * own rule cascade is what decides whether that's good or bad.
 */
function rawDirection(metricName: string, series: MetricSeriesPoint[]): TrendDirection | null {
  return rawDirectionFromTrend(detectTrend(metricName, series, "higher_is_better"), "higher_is_better");
}

/**
 * Same raw fact as rawDirection, derived from a TrendResult that was
 * already computed for some other polarity, instead of paying for a
 * second detectTrend call (sort + linear regression) over the same
 * series. `direction = (polarity === "higher_is_better") === rising ?
 * "improving" : "declining"` is detectTrend's own labeling rule -- this
 * inverts it algebraically to recover `rising`, so the result is
 * identical to calling detectTrend a second time with
 * "higher_is_better", just without redoing the regression.
 */
export function rawDirectionFromTrend(trend: TrendResult | null, polarity: MetricPolarity): TrendDirection | null {
  if (!trend) return null;
  if (trend.direction === "stable") return "stable";
  const higherIsBetter = polarity === "higher_is_better";
  const rising = trend.direction === "improving" ? higherIsBetter : !higherIsBetter;
  return rising ? "increasing" : "decreasing";
}

/**
 * Assembles the entire Daily Brief view model from real, already-fetched
 * data -- no network calls here, purely Metrics/Intelligence/Prediction/
 * Coach Engine calculations over `activities` and `metricsHistory` (both
 * already real data from the strava_activities/daily_pmc tables) plus an
 * optional upcoming goal. Deterministic and fully testable with synthetic
 * inputs.
 */
export function assembleDailyBrief(
  activities: Activity[],
  metricsHistory: MetricsSnapshot[],
  upcomingGoal: UpcomingGoal | null,
  today: string,
): DailyBriefViewModel {
  const latest = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1] : null;
  const ctl = latest?.ctl ?? null;
  const atl = latest?.atl ?? null;
  const tsb = latest?.tsb ?? null;

  const recoveryScore = tsb != null ? calculateRecoveryScore({ tsb }).value : null;
  const ctlHistory = metricsHistory.map((m) => m.ctl);
  const fitnessScore = ctl != null ? calculateFitnessScore({ ctl, ctlHistory }).value : null;

  const ctlSeries: MetricSeriesPoint[] = metricsHistory.map((m) => ({ date: m.date, value: m.ctl }));
  const atlSeries: MetricSeriesPoint[] = metricsHistory.map((m) => ({ date: m.date, value: m.atl }));
  const recoveryScoreSeries: MetricSeriesPoint[] = metricsHistory
    .map((m) => ({ date: m.date, value: calculateRecoveryScore({ tsb: m.tsb }).value }))
    .filter((p): p is MetricSeriesPoint => p.value != null);

  // Computed once with "lower_is_better" (the polarity its Insight needs)
  // and reused for atlTrend below via rawDirectionFromTrend, instead of
  // running detectTrend over the same atlSeries twice.
  const atlTrendInsight = detectTrend("Fatigue (ATL)", atlSeries, "lower_is_better");
  const atlTrend = rawDirectionFromTrend(atlTrendInsight, "lower_is_better");
  const recoveryScoreTrend = rawDirection("Recovery Score", recoveryScoreSeries);

  const injuryRiskResult = ctl != null && atl != null ? predictInjuryRisk(ctl, atl) : null;
  const injuryRiskLevel = injuryRiskResult?.value?.riskLevel ?? null;
  const acwr = injuryRiskResult?.value?.acwr ?? null;

  const recoveryTime = ctl != null && atl != null ? predictRecoveryTime(ctl, atl) : null;

  const ctlTrend = detectTrend("Fitness (CTL)", ctlSeries, "higher_is_better");
  const performanceTrendDeclining = ctlTrend != null && ctlTrend.direction === "declining" && ctlTrend.confidence > 0.5;

  const insights: Insight[] = [];
  if (ctlTrend) insights.push(ctlTrend);
  if (atlTrendInsight) insights.push(atlTrendInsight);
  const ctlPlateau = detectPlateau("Fitness (CTL)", ctlSeries);
  if (ctlPlateau) insights.push(ctlPlateau);

  const keyInsightSummaries = insights.slice(0, 3).map((insight) => insight.explanation);

  const upcomingRace = upcomingGoal ? { name: upcomingGoal.label ?? upcomingGoal.kind, date: upcomingGoal.targetDate } : null;

  const brief = generateDailyBrief({
    date: today,
    recoveryScore,
    fitnessScore,
    trainingSignals: {
      recoveryScore,
      recoveryScoreTrend,
      atlTrend,
      hrDriftTrend: null, // requires per-second activity streams (Activity Engine's `records` table), not populated yet
      lt1Trend: null, // requires lactate test history, not recorded yet
      tsb,
      injuryRiskLevel,
    },
    alertSignals: {
      injuryRiskLevel,
      tsb,
      recoveryScore,
      acwr,
      performanceTrendDeclining,
    },
    keyInsightSummaries,
    upcomingRace,
  });

  const recoveryRecommendations = recommendRecovery({
    recoveryScore,
    acwr,
    hrDriftTrend: null,
    hasWearableRecoveryData: false, // no wearable integration exists yet -- see PROJECT_AUDIT.md
  });

  const bestEfforts = extractBestEfforts(activities);
  const racePredictions = [
    { label: "5K", result: predict5K(bestEfforts) },
    { label: "10K", result: predict10K(bestEfforts) },
    { label: "Half Marathon", result: predictHalfMarathon(bestEfforts) },
    { label: "Marathon", result: predictMarathon(bestEfforts) },
  ];

  const trainingLoadHistory: TrainingLoadPoint[] = metricsHistory.map((m) => ({ date: m.date, ctl: m.ctl, atl: m.atl, tsb: m.tsb }));

  return {
    brief,
    insights,
    racePredictions,
    recoveryTime,
    recoveryRecommendations,
    trainingLoadHistory,
    timelineEvents: deriveTimeline(activities),
  };
}
