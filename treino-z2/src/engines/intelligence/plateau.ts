import type { Insight, MetricSeriesPoint } from "./types";

export interface PlateauResult extends Insight {
  kind: "plateau";
  windowSize: number;
  coefficientOfVariation: number;
}

const DEFAULT_WINDOW = 6;
// Standard deviation within 3% of the mean, over the window, counts as "flat".
const FLAT_CV_THRESHOLD = 0.03;

function standardDeviation(values: number[], mean: number): number {
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detects a plateau: the most recent `windowSize` points in a metric
 * series have stopped moving (low coefficient of variation), matching
 * the domain model's own Insight example ("Plateau detected"). Returns
 * null when there isn't enough data, or when the recent window is still
 * meaningfully moving.
 */
export function detectPlateau(
  metricName: string,
  series: MetricSeriesPoint[],
  windowSize: number = DEFAULT_WINDOW,
): PlateauResult | null {
  if (series.length < windowSize) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowSize);
  const values = window.map((p) => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return null;

  const coefficientOfVariation = standardDeviation(values, mean) / Math.abs(mean);
  if (coefficientOfVariation > FLAT_CV_THRESHOLD) return null;

  const confidence = Math.max(0, 1 - coefficientOfVariation / FLAT_CV_THRESHOLD) * Math.min(1, sorted.length / (windowSize * 2));

  return {
    kind: "plateau",
    metricName,
    windowSize,
    coefficientOfVariation,
    severity: "info",
    confidence,
    explanation: `${metricName} has plateaued around ${mean.toFixed(2)} over the last ${windowSize} data points (${window[0].date} to ${window[window.length - 1].date}).`,
    sourceMetrics: { window },
    recommendation: null,
  };
}
