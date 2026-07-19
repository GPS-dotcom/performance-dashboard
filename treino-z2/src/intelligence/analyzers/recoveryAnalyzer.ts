import { buildInsight } from "../insights/insightBuilder";
import { recoveryAboveExpectedTemplate, recoveryBelowExpectedTemplate } from "../insights/insightTemplates";
import { MIN_POINTS_FOR_RECOVERY_COMPARISON } from "../rules/recoveryRules";
import { classifySeries } from "./shared/trendMath";
import type { Insight } from "../types/insight";
import type { MetricSeriesPoint } from "../types/metricSeries";

/**
 * Recovery Analyzer (08_INTELLIGENCE_ENGINE.md: "Interpret ... Recovery
 * ... Fatigue ... Readiness"). Compares the Recovery Score series'
 * *trend* against the TSB series' *trend* (see rules/recoveryRules for
 * why this never recomputes a predicted score) to say whether recovery
 * is running ahead of or behind what the training load pattern alone
 * would suggest.
 */

function compare(recoveryScoreSeries: MetricSeriesPoint[], tsbSeries: MetricSeriesPoint[], date: string): Insight | null {
  if (recoveryScoreSeries.length < MIN_POINTS_FOR_RECOVERY_COMPARISON || tsbSeries.length < MIN_POINTS_FOR_RECOVERY_COMPARISON) return null;

  const recoveryTrend = classifySeries(recoveryScoreSeries, "higher_is_better");
  const tsbTrend = classifySeries(tsbSeries, "higher_is_better");
  if (!recoveryTrend || !tsbTrend) return null;

  // "Above expected": recovery improving while TSB is flat/declining, or
  // recovery improving meaningfully faster than TSB is.
  const aboveExpected =
    (recoveryTrend.direction === "improving" && tsbTrend.direction !== "improving") ||
    (recoveryTrend.direction === "improving" && tsbTrend.direction === "improving" && recoveryTrend.slopePerWeek > tsbTrend.slopePerWeek * 2);

  // "Below expected": recovery declining while TSB is flat/improving, or
  // recovery declining meaningfully faster than TSB's own decline.
  const belowExpected =
    (recoveryTrend.direction === "declining" && tsbTrend.direction !== "declining") ||
    (recoveryTrend.direction === "declining" && tsbTrend.direction === "declining" && recoveryTrend.slopePerWeek < tsbTrend.slopePerWeek * 2);

  if (!aboveExpected && !belowExpected) return null;

  const confidence = Math.min(recoveryTrend.confidence, tsbTrend.confidence);
  const evidence = [
    `Recovery Score trend: ${recoveryTrend.direction} (${recoveryTrend.slopePerWeek.toFixed(2)}/week)`,
    `TSB trend: ${tsbTrend.direction} (${tsbTrend.slopePerWeek.toFixed(2)}/week)`,
  ];

  if (aboveExpected) {
    const t = recoveryAboveExpectedTemplate(recoveryTrend.slopePerWeek, tsbTrend.slopePerWeek);
    return buildInsight({
      kind: "recovery_above_expected",
      category: "recovery",
      severity: "positive",
      title: t.title,
      description: t.description,
      evidence,
      confidence,
      relatedMetrics: ["recovery_score", "tsb"],
      date,
    });
  }

  const t = recoveryBelowExpectedTemplate(recoveryTrend.slopePerWeek, tsbTrend.slopePerWeek);
  return buildInsight({
    kind: "recovery_below_expected",
    category: "recovery",
    severity: "warning",
    title: t.title,
    description: t.description,
    evidence,
    confidence,
    relatedMetrics: ["recovery_score", "tsb"],
    date,
  });
}

/** "recuperação acima do esperado" / "recuperação abaixo do esperado" -- a single comparison that returns whichever (if either) applies. */
export function analyzeRecoveryVsExpected(recoveryScoreSeries: MetricSeriesPoint[], tsbSeries: MetricSeriesPoint[], date: string): Insight | null {
  return compare(recoveryScoreSeries, tsbSeries, date);
}
