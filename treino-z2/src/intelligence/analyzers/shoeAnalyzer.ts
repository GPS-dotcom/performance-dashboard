import { buildInsight } from "../insights/insightBuilder";
import {
  newShoePersonalBestTemplate,
  performanceDifferenceBetweenShoesTemplate,
  shoeApproachingReplacementTemplate,
  shoeReplacementRecommendedTemplate,
} from "../insights/insightTemplates";
import { PR_TIE_TOLERANCE_FRACTION } from "../rules/performanceRules";
import {
  MIN_ACTIVITIES_FOR_SHOE_INSIGHT,
  NEW_SHOE_ACTIVITY_COUNT_THRESHOLD,
  SHOE_APPROACHING_REPLACEMENT_FRACTION,
  SHOE_PERFORMANCE_DIFFERENCE_FRACTION,
  SHOE_REPLACEMENT_MILEAGE_KM,
} from "../rules/shoeRules";
import type { Insight } from "../types/insight";
import type { ActivityWithShoe } from "../types/analyzerInputs";

export interface ShoeUsageSummary {
  shoe: string;
  activityCount: number;
  totalDistanceKm: number;
  averagePaceSecPerKm: number | null;
  averagePowerWatts: number | null;
}

function sortedByDate(activities: ActivityWithShoe[]): ActivityWithShoe[] {
  return [...activities].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function paceOf(activity: ActivityWithShoe): number | null {
  return activity.distanceM && activity.movingTimeS && activity.distanceM > 0 ? activity.movingTimeS / (activity.distanceM / 1000) : null;
}

/** "histórico de uso": per-shoe aggregate stats, used as evidence by analyzeShoeWear/analyzeShoePerformanceDifference below rather than emitting its own insight -- usage totals aren't themselves an anomaly. */
export function computeShoeUsageSummary(activities: ActivityWithShoe[]): ShoeUsageSummary[] {
  const byShoe = new Map<string, ActivityWithShoe[]>();
  for (const activity of activities) {
    if (!activity.shoe) continue;
    const list = byShoe.get(activity.shoe) ?? [];
    list.push(activity);
    byShoe.set(activity.shoe, list);
  }

  return Array.from(byShoe.entries()).map(([shoe, shoeActivities]) => {
    const totalDistanceKm = shoeActivities.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    const paces = shoeActivities.map(paceOf).filter((p): p is number => p != null);
    const powers = shoeActivities.map((a) => a.averageWatts).filter((p): p is number => p != null);
    return {
      shoe,
      activityCount: shoeActivities.length,
      totalDistanceKm,
      averagePaceSecPerKm: paces.length > 0 ? paces.reduce((s, p) => s + p, 0) / paces.length : null,
      averagePowerWatts: powers.length > 0 ? powers.reduce((s, p) => s + p, 0) / powers.length : null,
    };
  });
}

/** "desgaste": mileage-based replacement guidance per shoe. */
export function analyzeShoeWear(activities: ActivityWithShoe[], date: string): Insight[] {
  const summaries = computeShoeUsageSummary(activities).filter((s) => s.activityCount >= MIN_ACTIVITIES_FOR_SHOE_INSIGHT);
  const insights: Insight[] = [];

  for (const summary of summaries) {
    if (summary.totalDistanceKm >= SHOE_REPLACEMENT_MILEAGE_KM) {
      const t = shoeReplacementRecommendedTemplate(summary.shoe, summary.totalDistanceKm, SHOE_REPLACEMENT_MILEAGE_KM);
      insights.push(
        buildInsight({
          kind: "shoe_replacement_recommended",
          category: "equipment",
          severity: "warning",
          title: t.title,
          description: t.description,
          evidence: [`${summary.activityCount} activities, ${summary.totalDistanceKm.toFixed(0)}km total`],
          confidence: 0.85,
          relatedMetrics: ["shoe_mileage_km"],
          date,
          idSuffix: summary.shoe,
        }),
      );
    } else if (summary.totalDistanceKm >= SHOE_REPLACEMENT_MILEAGE_KM * SHOE_APPROACHING_REPLACEMENT_FRACTION) {
      const t = shoeApproachingReplacementTemplate(summary.shoe, summary.totalDistanceKm, SHOE_REPLACEMENT_MILEAGE_KM);
      insights.push(
        buildInsight({
          kind: "shoe_approaching_replacement",
          category: "equipment",
          severity: "information",
          title: t.title,
          description: t.description,
          evidence: [`${summary.activityCount} activities, ${summary.totalDistanceKm.toFixed(0)}km total`],
          confidence: 0.75,
          relatedMetrics: ["shoe_mileage_km"],
          date,
          idSuffix: summary.shoe,
        }),
      );
    }
  }

  return insights;
}

/** "rendimento": pairwise pace comparison between the two most-used shoes. */
export function analyzeShoePerformanceDifference(activities: ActivityWithShoe[], date: string): Insight | null {
  const summaries = computeShoeUsageSummary(activities)
    .filter((s) => s.activityCount >= MIN_ACTIVITIES_FOR_SHOE_INSIGHT && s.averagePaceSecPerKm != null)
    .sort((a, b) => b.activityCount - a.activityCount);

  if (summaries.length < 2) return null;
  const [a, b] = summaries;
  const paceA = a.averagePaceSecPerKm!;
  const paceB = b.averagePaceSecPerKm!;
  const difference = Math.abs(paceA - paceB) / Math.max(paceA, paceB);
  if (difference < SHOE_PERFORMANCE_DIFFERENCE_FRACTION) return null;

  const t = performanceDifferenceBetweenShoesTemplate(a.shoe, b.shoe, "Average Pace", difference * 100);
  return buildInsight({
    kind: "shoe_performance_difference",
    category: "equipment",
    severity: "information",
    title: t.title,
    description: t.description,
    evidence: [`${a.shoe}: ${paceA.toFixed(0)}s/km over ${a.activityCount} activities`, `${b.shoe}: ${paceB.toFixed(0)}s/km over ${b.activityCount} activities`],
    confidence: Math.min(1, Math.min(a.activityCount, b.activityCount) / 10),
    relatedMetrics: ["shoe_average_pace"],
    date,
    idSuffix: `${a.shoe}_vs_${b.shoe}`,
  });
}

/** "rendimento": a PR set within a shoe's first activities. */
export function detectNewShoePersonalBests(activities: ActivityWithShoe[], date: string): Insight[] {
  const sorted = sortedByDate(activities);
  const bestSoFar = new Map<string, number>();
  const shoeActivityCount = new Map<string, number>();
  const insights: Insight[] = [];

  for (const activity of sorted) {
    if (activity.shoe) shoeActivityCount.set(activity.shoe, (shoeActivityCount.get(activity.shoe) ?? 0) + 1);

    if (!activity.bestEfforts) continue;
    for (const [distanceKey, timeSec] of Object.entries(activity.bestEfforts)) {
      const previousBest = bestSoFar.get(distanceKey);
      const isNewBest = previousBest == null || timeSec < previousBest * (1 - PR_TIE_TOLERANCE_FRACTION);
      if (isNewBest) {
        const countOnShoe = activity.shoe ? shoeActivityCount.get(activity.shoe) : undefined;
        const isNewShoe = activity.shoe != null && countOnShoe != null && countOnShoe <= NEW_SHOE_ACTIVITY_COUNT_THRESHOLD;
        if (isNewShoe && activity.startDate.slice(0, 10) === date) {
          const t = newShoePersonalBestTemplate(activity.shoe!, distanceKey);
          insights.push(
            buildInsight({
              kind: "shoe_new_pr",
              category: "equipment",
              severity: "positive",
              title: t.title,
              description: t.description,
              evidence: [`${distanceKey} best: ${timeSec.toFixed(0)}s, activity #${countOnShoe} on ${activity.shoe}`],
              confidence: 0.8,
              relatedMetrics: ["best_effort"],
              date,
              idSuffix: `${activity.shoe}_${distanceKey}`,
            }),
          );
        }
        bestSoFar.set(distanceKey, timeSec);
      }
    }
  }

  return insights;
}
