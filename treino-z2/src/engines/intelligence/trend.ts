import type { Insight, MetricPolarity, MetricSeriesPoint } from "./types";

export interface TrendResult extends Insight {
  kind: "trend";
  direction: "improving" | "declining" | "stable";
  slopePerDay: number;
  rSquared: number;
}

const MIN_POINTS = 4;
// A slope smaller than 1% of the series mean, per day, doesn't read as a real trend.
const STABLE_SLOPE_THRESHOLD_FRACTION = 0.01;

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; rSquared: number } {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  for (const p of points) {
    ssXY += (p.x - meanX) * (p.y - meanY);
    ssXX += (p.x - meanX) ** 2;
    ssYY += (p.y - meanY) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);
  return { slope, rSquared };
}

/**
 * Detects a linear trend in a metric series via least-squares regression.
 * `polarity` says whether a rising value is an improvement (e.g. CTL,
 * Critical Power) or a decline (e.g. pace, where a lower number is
 * faster). Needs at least 4 points; returns null otherwise (not enough
 * data to say anything).
 */
export function detectTrend(
  metricName: string,
  series: MetricSeriesPoint[],
  polarity: MetricPolarity = "higher_is_better",
): TrendResult | null {
  if (series.length < MIN_POINTS) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((p) => ({ x: toDayNumber(p.date), y: p.value }));
  const { slope, rSquared } = linearRegression(points);

  const meanValue = points.reduce((s, p) => s + p.y, 0) / points.length;
  const relativeSlope = meanValue !== 0 ? Math.abs(slope) / Math.abs(meanValue) : Math.abs(slope);

  let direction: "improving" | "declining" | "stable";
  if (relativeSlope < STABLE_SLOPE_THRESHOLD_FRACTION) {
    direction = "stable";
  } else {
    const rising = slope > 0;
    direction = (polarity === "higher_is_better") === rising ? "improving" : "declining";
  }

  const confidence = Math.max(0, Math.min(1, rSquared)) * Math.min(1, series.length / 14);
  const severity = direction === "declining" ? "warning" : "info";

  const explanation =
    direction === "stable"
      ? `${metricName} has been stable over the last ${series.length} data points.`
      : `${metricName} is ${direction} (${(slope * 7).toFixed(2)} per week) over the last ${series.length} data points.`;

  return {
    kind: "trend",
    metricName,
    direction,
    slopePerDay: slope,
    rSquared,
    severity,
    confidence,
    explanation,
    sourceMetrics: { series: sorted, polarity },
    recommendation: null,
  };
}
