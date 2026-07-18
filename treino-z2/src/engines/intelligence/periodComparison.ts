import type { Insight, MetricPolarity, MetricSeriesPoint } from "./types";

export interface PeriodComparisonResult extends Insight {
  kind: "block_comparison" | "season_comparison";
  periodALabel: string;
  periodBLabel: string;
  periodAMean: number;
  periodBMean: number;
  absoluteChange: number;
  percentChange: number | null;
  direction: "improved" | "declined" | "unchanged";
}

export interface NamedPeriod {
  label: string;
  series: MetricSeriesPoint[];
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function comparePeriods(
  kind: "block_comparison" | "season_comparison",
  metricName: string,
  periodA: NamedPeriod,
  periodB: NamedPeriod,
  polarity: MetricPolarity,
): PeriodComparisonResult | null {
  if (periodA.series.length === 0 || periodB.series.length === 0) return null;

  const meanA = mean(periodA.series.map((p) => p.value));
  const meanB = mean(periodB.series.map((p) => p.value));
  const absoluteChange = meanB - meanA;
  const percentChange = meanA !== 0 ? (absoluteChange / Math.abs(meanA)) * 100 : null;

  let direction: "improved" | "declined" | "unchanged";
  if (absoluteChange === 0) {
    direction = "unchanged";
  } else {
    const rose = absoluteChange > 0;
    direction = (polarity === "higher_is_better") === rose ? "improved" : "declined";
  }

  const confidence = Math.min(1, Math.min(periodA.series.length, periodB.series.length) / 5);
  const severity = direction === "declined" ? "warning" : "info";

  const changeText =
    percentChange != null
      ? `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`
      : `${absoluteChange >= 0 ? "+" : ""}${absoluteChange.toFixed(2)}`;

  return {
    kind,
    metricName,
    periodALabel: periodA.label,
    periodBLabel: periodB.label,
    periodAMean: meanA,
    periodBMean: meanB,
    absoluteChange,
    percentChange,
    direction,
    severity,
    confidence,
    explanation: `${metricName} averaged ${meanB.toFixed(2)} in "${periodB.label}" vs. ${meanA.toFixed(2)} in "${periodA.label}" (${changeText}).`,
    sourceMetrics: { periodA, periodB, polarity },
    recommendation: null,
  };
}

/** Compares a metric's average between two training blocks (e.g. Base phase vs. Build phase). */
export function compareTrainingBlocks(
  metricName: string,
  blockA: NamedPeriod,
  blockB: NamedPeriod,
  polarity: MetricPolarity = "higher_is_better",
): PeriodComparisonResult | null {
  return comparePeriods("block_comparison", metricName, blockA, blockB, polarity);
}

/** Compares a metric's average between two seasons (e.g. this year's build vs. last year's). */
export function compareSeasons(
  metricName: string,
  seasonA: NamedPeriod,
  seasonB: NamedPeriod,
  polarity: MetricPolarity = "higher_is_better",
): PeriodComparisonResult | null {
  return comparePeriods("season_comparison", metricName, seasonA, seasonB, polarity);
}
