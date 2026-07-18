import { buildInsight } from "../insights/insightBuilder";
import { accelerationTemplate, plateauTemplate, regressionTemplate } from "../insights/insightTemplates";
import { ACCELERATION_SLOPE_MULTIPLIER, DEFAULT_PLATEAU_WINDOW, FLAT_CV_THRESHOLD } from "../rules/plateauRules";
import { classifySeries } from "../analyzers/shared/trendMath";
import type { Insight, InsightCategory } from "../types/insight";
import type { MetricPolarity, MetricSeriesPoint } from "../types/metricSeries";

/**
 * Plateau Detector (08_INTELLIGENCE_ENGINE.md: "Identify trends" +
 * 19_INSIGHTS_LIBRARY.md's "Performance Plateau"/"Declining
 * Performance"). Classifies the *shape* of a series' most recent window
 * -- flat, declining faster than the series overall, or accelerating --
 * reusing trendAnalyzer's own classifySeries so the regression math
 * exists in exactly one place (analyzers/shared/trendMath.ts).
 */

function standardDeviation(values: number[], mean: number): number {
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** "detectar estagnação": the most recent window has stopped moving (low coefficient of variation). */
export function detectStagnation(
  metricLabel: string,
  metricName: string,
  series: MetricSeriesPoint[],
  category: InsightCategory,
  date: string,
  windowSize: number = DEFAULT_PLATEAU_WINDOW,
): Insight | null {
  if (series.length < windowSize) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowSize);
  const values = window.map((p) => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return null;

  const coefficientOfVariation = standardDeviation(values, mean) / Math.abs(mean);
  if (coefficientOfVariation > FLAT_CV_THRESHOLD) return null;

  const confidence = Math.max(0, 1 - coefficientOfVariation / FLAT_CV_THRESHOLD) * Math.min(1, sorted.length / (windowSize * 2));
  const t = plateauTemplate(metricLabel, windowSize, mean);

  return buildInsight({
    kind: `plateau_stagnation_${metricName}`,
    category,
    severity: "information",
    title: t.title,
    description: t.description,
    evidence: [`coefficient of variation ${(coefficientOfVariation * 100).toFixed(2)}% over the last ${windowSize} points`, `window: ${window[0].date} to ${window[window.length - 1].date}`],
    confidence,
    relatedMetrics: [metricName],
    date,
  });
}

/** "detectar regressão": the most recent window is declining, using the same classification trendAnalyzer uses. */
export function detectRegression(
  metricLabel: string,
  metricName: string,
  series: MetricSeriesPoint[],
  polarity: MetricPolarity,
  category: InsightCategory,
  date: string,
  windowSize: number = DEFAULT_PLATEAU_WINDOW,
): Insight | null {
  if (series.length < windowSize) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowSize);
  const recent = classifySeries(window, polarity);
  if (!recent || recent.direction !== "declining") return null;

  const t = regressionTemplate(metricLabel, windowSize, recent.slopePerWeek);
  return buildInsight({
    kind: `plateau_regression_${metricName}`,
    category,
    severity: "warning",
    title: t.title,
    description: t.description,
    evidence: [`recent-window slope ${recent.slopePerWeek.toFixed(3)}/week (R² ${recent.rSquared.toFixed(2)}) over the last ${windowSize} points`],
    confidence: recent.confidence,
    relatedMetrics: [metricName],
    date,
  });
}

/** "detectar evolução acelerada": the recent window is improving meaningfully faster than the series' overall trend. */
export function detectAcceleration(
  metricLabel: string,
  metricName: string,
  series: MetricSeriesPoint[],
  polarity: MetricPolarity,
  category: InsightCategory,
  date: string,
  windowSize: number = DEFAULT_PLATEAU_WINDOW,
): Insight | null {
  if (series.length < windowSize * 2) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowSize);

  const overall = classifySeries(sorted, polarity);
  const recent = classifySeries(window, polarity);
  if (!overall || !recent || recent.direction !== "improving") return null;

  // Compare magnitudes in the "improving" direction regardless of polarity sign convention.
  const overallMagnitude = Math.abs(overall.slopePerWeek);
  const recentMagnitude = Math.abs(recent.slopePerWeek);
  if (overallMagnitude === 0 || recentMagnitude < overallMagnitude * ACCELERATION_SLOPE_MULTIPLIER) return null;

  const t = accelerationTemplate(metricLabel, windowSize, recent.slopePerWeek, overall.slopePerWeek);
  return buildInsight({
    kind: `plateau_acceleration_${metricName}`,
    category,
    severity: "positive",
    title: t.title,
    description: t.description,
    evidence: [`recent-window slope ${recent.slopePerWeek.toFixed(3)}/week vs. overall ${overall.slopePerWeek.toFixed(3)}/week`],
    confidence: Math.min(recent.confidence, overall.confidence),
    relatedMetrics: [metricName],
    date,
  });
}
