import { buildInsight } from "../insights/insightBuilder";
import {
  excellentConsistencyTemplate,
  planAdherenceStrongTemplate,
  planAdherenceWeakTemplate,
  reducedConsistencyTemplate,
  regularTrainingPatternTemplate,
  trainingInterruptionTemplate,
  volumeIrregularTemplate,
  volumeStableTemplate,
} from "../insights/insightTemplates";
import {
  EXCELLENT_FREQUENCY_MIN_ACTIVE_WEEK_FRACTION,
  GOOD_ADHERENCE_RATIO,
  MAX_REGULAR_GAP_WEEKS,
  MIN_WEEKS_FOR_CONSISTENCY_INSIGHT,
  REDUCED_CONSISTENCY_MISSED_WEEK_FRACTION,
  STABLE_VOLUME_CV_THRESHOLD,
} from "../rules/consistencyRules";
import type { Insight } from "../types/insight";
import type { WeeklyTrainingSummary } from "../types/analyzerInputs";

function stddev(values: number[], mean: number): number {
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/**
 * Consistency Analyzer (08_INTELLIGENCE_ENGINE.md: "Evaluate ... Workout
 * Compliance ... Consistency"). Operates on a caller-supplied weekly
 * summary rather than raw Activity[] -- how a week's activities roll up
 * into sessions/distance/duration is the caller's concern (and already
 * exists as weeklyLoadAnalyzer in the Metrics Engine); this module only
 * interprets the resulting weekly series.
 */

/** "frequência semanal": fraction of weeks with at least one session. */
export function analyzeWeeklyFrequency(weeks: WeeklyTrainingSummary[], date: string): Insight | null {
  if (weeks.length < MIN_WEEKS_FOR_CONSISTENCY_INSIGHT) return null;

  const activeWeeks = weeks.filter((w) => w.sessionsCompleted > 0).length;
  const activeFraction = activeWeeks / weeks.length;
  const missedFraction = 1 - activeFraction;

  if (activeFraction >= EXCELLENT_FREQUENCY_MIN_ACTIVE_WEEK_FRACTION) {
    const t = excellentConsistencyTemplate(activeWeeks, weeks.length);
    return buildInsight({
      kind: "consistency_frequency_excellent",
      category: "consistency",
      severity: "positive",
      title: t.title,
      description: t.description,
      evidence: [`${activeWeeks} of ${weeks.length} weeks had at least one session`],
      confidence: Math.min(1, weeks.length / 8),
      relatedMetrics: ["weekly_session_count"],
      date,
    });
  }

  if (missedFraction >= REDUCED_CONSISTENCY_MISSED_WEEK_FRACTION) {
    const missedWeeks = weeks.length - activeWeeks;
    const t = reducedConsistencyTemplate(missedWeeks, weeks.length);
    return buildInsight({
      kind: "consistency_frequency_reduced",
      category: "consistency",
      severity: "warning",
      title: t.title,
      description: t.description,
      evidence: [`${missedWeeks} of ${weeks.length} weeks had no recorded sessions`],
      confidence: Math.min(1, weeks.length / 8),
      relatedMetrics: ["weekly_session_count"],
      date,
    });
  }

  return null;
}

/** "volume": week-to-week stability of training volume (distance). */
export function analyzeVolumeConsistency(weeks: WeeklyTrainingSummary[], date: string): Insight | null {
  if (weeks.length < MIN_WEEKS_FOR_CONSISTENCY_INSIGHT) return null;

  const volumes = weeks.map((w) => w.distanceKm);
  const mean = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  if (mean === 0) return null;

  const cv = stddev(volumes, mean) / mean;
  const stable = cv <= STABLE_VOLUME_CV_THRESHOLD;
  const t = stable ? volumeStableTemplate(cv, weeks.length) : volumeIrregularTemplate(cv, weeks.length);

  return buildInsight({
    kind: stable ? "consistency_volume_stable" : "consistency_volume_irregular",
    category: "consistency",
    severity: stable ? "positive" : "warning",
    title: t.title,
    description: t.description,
    evidence: [`coefficient of variation ${(cv * 100).toFixed(1)}% across ${weeks.length} weeks`],
    confidence: Math.min(1, weeks.length / 8),
    relatedMetrics: ["weekly_distance_km"],
    date,
  });
}

/** "aderência ao plano": completed vs. planned sessions. Returns null (not "not enough data") when no plan exists -- adherence is meaningless without one. */
export function analyzePlanAdherence(weeks: WeeklyTrainingSummary[], plannedSessionsPerWeek: number | null, date: string): Insight | null {
  if (plannedSessionsPerWeek == null || plannedSessionsPerWeek <= 0 || weeks.length < MIN_WEEKS_FOR_CONSISTENCY_INSIGHT) return null;

  const totalCompleted = weeks.reduce((s, w) => s + w.sessionsCompleted, 0);
  const totalPlanned = plannedSessionsPerWeek * weeks.length;
  const adherenceRatio = totalCompleted / totalPlanned;
  const strong = adherenceRatio >= GOOD_ADHERENCE_RATIO;
  const t = strong ? planAdherenceStrongTemplate(adherenceRatio, weeks.length) : planAdherenceWeakTemplate(adherenceRatio, weeks.length);

  return buildInsight({
    kind: strong ? "consistency_adherence_strong" : "consistency_adherence_weak",
    category: "consistency",
    severity: strong ? "positive" : "warning",
    title: t.title,
    description: t.description,
    evidence: [`${totalCompleted} of ${totalPlanned.toFixed(0)} planned sessions completed`],
    confidence: Math.min(1, weeks.length / 8),
    relatedMetrics: ["weekly_session_count"],
    date,
  });
}

/** "regularidade": longest gap of fully-missed consecutive weeks, distinct from the overall missed-week fraction above. */
export function analyzeTrainingRegularity(weeks: WeeklyTrainingSummary[], date: string): Insight | null {
  if (weeks.length < MIN_WEEKS_FOR_CONSISTENCY_INSIGHT) return null;

  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  let longestGap = 0;
  let currentGap = 0;
  for (const week of sorted) {
    if (week.sessionsCompleted === 0) {
      currentGap += 1;
      longestGap = Math.max(longestGap, currentGap);
    } else {
      currentGap = 0;
    }
  }

  if (longestGap > MAX_REGULAR_GAP_WEEKS) {
    const t = trainingInterruptionTemplate(longestGap);
    return buildInsight({
      kind: "consistency_regularity_interrupted",
      category: "consistency",
      severity: "warning",
      title: t.title,
      description: t.description,
      evidence: [`longest gap: ${longestGap} consecutive weeks with no sessions`],
      confidence: Math.min(1, weeks.length / 8),
      relatedMetrics: ["weekly_session_count"],
      date,
    });
  }

  const t = regularTrainingPatternTemplate(weeks.length);
  return buildInsight({
    kind: "consistency_regularity_stable",
    category: "consistency",
    severity: "positive",
    title: t.title,
    description: t.description,
    evidence: [`longest gap: ${longestGap} consecutive weeks`],
    confidence: Math.min(1, weeks.length / 8),
    relatedMetrics: ["weekly_session_count"],
    date,
  });
}
