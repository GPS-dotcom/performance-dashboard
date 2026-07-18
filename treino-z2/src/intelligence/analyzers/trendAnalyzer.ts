import { buildInsight } from "../insights/insightBuilder";
import { trendDecliningTemplate, trendImprovingTemplate, trendStableTemplate } from "../insights/insightTemplates";
import { classifySeries, type TrendClassification } from "./shared/trendMath";
import type { Insight, InsightCategory } from "../types/insight";
import type { MetricPolarity, MetricSeriesPoint } from "../types/metricSeries";

/**
 * Turns an already-computed TrendClassification into an Insight. Split
 * out from analyzeTrend so a caller that also needs the raw
 * direction/confidence for its own purposes (e.g.
 * hooks/assembleDailyBrief.ts feeding the Coach Engine's
 * TrainingSignals) can call classifySeries once and get both the raw
 * classification and the rendered Insight from it, instead of this
 * engine and the caller each running the same regression separately.
 */
export function buildTrendInsight(
  metricLabel: string,
  relatedMetric: string,
  trend: TrendClassification,
  category: InsightCategory,
  date: string,
): Insight {
  const template =
    trend.direction === "improving"
      ? trendImprovingTemplate(metricLabel, trend.slopePerWeek, trend.pointCount)
      : trend.direction === "declining"
        ? trendDecliningTemplate(metricLabel, trend.slopePerWeek, trend.pointCount)
        : trendStableTemplate(metricLabel, trend.pointCount);

  return buildInsight({
    kind: `trend_${relatedMetric}_${trend.direction}`,
    category,
    severity: trend.direction === "declining" ? "warning" : "information",
    title: template.title,
    description: template.description,
    evidence: [
      `${trend.pointCount} data points from ${trend.sorted[0].date} to ${trend.sorted[trend.sorted.length - 1].date}`,
      `slope ${trend.slopePerWeek.toFixed(3)} per week (R² ${trend.rSquared.toFixed(2)})`,
    ],
    confidence: trend.confidence,
    relatedMetrics: [relatedMetric],
    date,
  });
}

/**
 * Trend Analyzer (08_INTELLIGENCE_ENGINE.md: "Identify trends"). Fits a
 * least-squares line to `series` and classifies it as improving,
 * declining or stable -- the one generic implementation every one of the
 * 5 requested sub-capabilities (fitness/load/power/pace/HR evolution)
 * calls, since they're the same statistical question asked of 5
 * different Metrics Engine outputs. Returns null when there's too
 * little data to say anything (see rules/trendRules.MIN_TREND_POINTS).
 */
export function analyzeTrend(
  metricLabel: string,
  relatedMetric: string,
  series: MetricSeriesPoint[],
  polarity: MetricPolarity,
  category: InsightCategory,
  date: string,
): Insight | null {
  const trend = classifySeries(series, polarity);
  if (!trend) return null;
  return buildTrendInsight(metricLabel, relatedMetric, trend, category, date);
}

/** "evolução de fitness" -- CTL (or Fitness Score) trend. 19_INSIGHTS_LIBRARY.md's Fitness Insights category. */
export function analyzeFitnessEvolution(series: MetricSeriesPoint[], date: string): Insight | null {
  return analyzeTrend("Fitness", "ctl", series, "higher_is_better", "fitness", date);
}

/** "evolução de carga" -- CTL/ATL/session load trend. Training Load Insights category. */
export function analyzeLoadEvolution(series: MetricSeriesPoint[], date: string): Insight | null {
  return analyzeTrend("Training Load", "training_load", series, "higher_is_better", "training_load", date);
}

/** "evolução de potência" -- Critical Power / FTP trend. Grouped under Fitness per 19_INSIGHTS_LIBRARY.md's "Critical Power Increased" example. */
export function analyzePowerEvolution(series: MetricSeriesPoint[], date: string): Insight | null {
  return analyzeTrend("Power", "critical_power", series, "higher_is_better", "fitness", date);
}

/** "evolução de pace" -- threshold/race pace trend (lower is faster). Grouped under Fitness alongside power. */
export function analyzePaceEvolution(series: MetricSeriesPoint[], date: string): Insight | null {
  return analyzeTrend("Pace", "pace", series, "lower_is_better", "fitness", date);
}

/** "evolução de frequência cardíaca" -- resting/average HR trend (lower is generally better aerobic adaptation). Grouped under Physiology. */
export function analyzeHeartRateEvolution(series: MetricSeriesPoint[], date: string): Insight | null {
  return analyzeTrend("Heart Rate", "heart_rate", series, "lower_is_better", "physiology", date);
}
