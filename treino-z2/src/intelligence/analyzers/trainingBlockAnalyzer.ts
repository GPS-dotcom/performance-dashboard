import { buildInsight } from "../insights/insightBuilder";
import { bestTrainingBlockTemplate, periodComparisonDeclinedTemplate, periodComparisonImprovedTemplate } from "../insights/insightTemplates";
import { BEST_PERIOD_MARGIN_FRACTION, MIN_PERIOD_ACTIVITIES } from "../rules/trainingBlockRules";
import type { Insight } from "../types/insight";
import type { MetricPolarity } from "../types/metricSeries";
import type { NamedPeriod } from "../types/analyzerInputs";

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Training Block Analyzer (08_INTELLIGENCE_ENGINE.md: comparisons
 * "between training blocks or seasons"). `kind` distinguishes a block
 * comparison from a season/cycle comparison only in the Insight's `kind`
 * id and evidence wording -- the underlying comparison math is identical
 * for all three, so it exists in exactly one function.
 */
export type PeriodComparisonKind = "block" | "season" | "cycle";

/** "comparar blocos" / "comparar temporadas" / "comparar ciclos": mean comparison between exactly two named periods. */
export function comparePeriods(
  kind: PeriodComparisonKind,
  metricLabel: string,
  metricName: string,
  periodA: NamedPeriod,
  periodB: NamedPeriod,
  polarity: MetricPolarity,
  date: string,
): Insight | null {
  if (periodA.series.length < MIN_PERIOD_ACTIVITIES || periodB.series.length < MIN_PERIOD_ACTIVITIES) return null;

  const meanA = mean(periodA.series.map((p) => p.value));
  const meanB = mean(periodB.series.map((p) => p.value));
  const absoluteChange = meanB - meanA;
  if (absoluteChange === 0) return null;

  const rose = absoluteChange > 0;
  const improved = (polarity === "higher_is_better") === rose;
  const confidence = Math.min(1, Math.min(periodA.series.length, periodB.series.length) / 5);

  const t = improved
    ? periodComparisonImprovedTemplate(metricLabel, periodA.label, periodB.label, meanA, meanB)
    : periodComparisonDeclinedTemplate(metricLabel, periodA.label, periodB.label, meanA, meanB);

  return buildInsight({
    kind: `training_${kind}_comparison_${metricName}_${improved ? "improved" : "declined"}`,
    category: "performance",
    severity: improved ? "positive" : "warning",
    title: t.title,
    description: t.description,
    evidence: [`"${periodA.label}": ${periodA.series.length} points, mean ${meanA.toFixed(2)}`, `"${periodB.label}": ${periodB.series.length} points, mean ${meanB.toFixed(2)}`],
    confidence,
    relatedMetrics: [metricName],
    date,
    idSuffix: `${periodA.label}_vs_${periodB.label}`,
  });
}

/** "comparar blocos"/"temporadas"/"ciclos" across N periods at once: which one is objectively the best by this metric. */
export function findBestPeriod(
  kind: PeriodComparisonKind,
  metricLabel: string,
  metricName: string,
  periods: NamedPeriod[],
  polarity: MetricPolarity,
  date: string,
): Insight | null {
  const eligible = periods.filter((p) => p.series.length >= MIN_PERIOD_ACTIVITIES);
  if (eligible.length < 2) return null;

  const means = eligible.map((p) => ({ label: p.label, mean: mean(p.series.map((pt) => pt.value)), count: p.series.length }));
  const sorted = [...means].sort((a, b) => (polarity === "higher_is_better" ? b.mean - a.mean : a.mean - b.mean));
  const [best, runnerUp] = sorted;

  const margin = runnerUp.mean !== 0 ? Math.abs(best.mean - runnerUp.mean) / Math.abs(runnerUp.mean) : 0;
  if (margin < BEST_PERIOD_MARGIN_FRACTION) return null;

  const t = bestTrainingBlockTemplate(best.label, metricLabel, margin * 100);
  return buildInsight({
    kind: `training_${kind}_best_${metricName}`,
    category: "performance",
    severity: "positive",
    title: t.title,
    description: t.description,
    evidence: sorted.map((p) => `"${p.label}": mean ${p.mean.toFixed(2)} (${p.count} points)`),
    confidence: Math.min(1, best.count / 10),
    relatedMetrics: [metricName],
    date,
    idSuffix: best.label,
  });
}
