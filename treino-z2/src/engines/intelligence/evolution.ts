import type { Insight, MetricPolarity, MetricSeriesPoint } from "./types";

export interface EvolutionResult extends Insight {
  kind: "evolution";
  firstValue: number;
  lastValue: number;
  absoluteChange: number;
  percentChange: number | null;
  direction: "improved" | "declined" | "unchanged";
}

/**
 * Summarizes how a metric evolved from the first to the last point in a
 * series -- a simple, human-readable "went from X to Y" statement, distinct
 * from detectTrend's statistical slope (matches the domain model's own
 * Insight example: "LT1 increased").
 */
export function summarizeEvolution(
  metricName: string,
  series: MetricSeriesPoint[],
  polarity: MetricPolarity = "higher_is_better",
): EvolutionResult | null {
  if (series.length < 2) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const absoluteChange = last - first;
  const percentChange = first !== 0 ? (absoluteChange / Math.abs(first)) * 100 : null;

  let direction: "improved" | "declined" | "unchanged";
  if (absoluteChange === 0) {
    direction = "unchanged";
  } else {
    const rose = absoluteChange > 0;
    direction = (polarity === "higher_is_better") === rose ? "improved" : "declined";
  }

  const confidence = Math.min(1, sorted.length / 10);
  const severity = direction === "declined" ? "warning" : "info";

  const changeText =
    percentChange != null
      ? `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`
      : `${absoluteChange >= 0 ? "+" : ""}${absoluteChange.toFixed(2)}`;

  return {
    kind: "evolution",
    metricName,
    firstValue: first,
    lastValue: last,
    absoluteChange,
    percentChange,
    direction,
    severity,
    confidence,
    explanation: `${metricName} went from ${first.toFixed(2)} to ${last.toFixed(2)} (${changeText}) between ${sorted[0].date} and ${sorted[sorted.length - 1].date}.`,
    sourceMetrics: { first: sorted[0], last: sorted[sorted.length - 1], polarity },
    recommendation: null,
  };
}
