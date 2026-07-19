import { MIN_TREND_POINTS, STABLE_SLOPE_THRESHOLD_FRACTION, TREND_CONFIDENCE_SATURATION_POINTS } from "../../rules/trendRules";
import type { MetricPolarity, MetricSeriesPoint } from "../../types/metricSeries";
import { linearRegression } from "./linearRegression";

export type TrendDirection = "improving" | "declining" | "stable";

export interface TrendClassification {
  direction: TrendDirection;
  slopePerDay: number;
  slopePerWeek: number;
  rSquared: number;
  confidence: number;
  pointCount: number;
  sorted: MetricSeriesPoint[];
}

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

/**
 * Shared by trendAnalyzer (whole-series trend) and plateauDetector
 * (recent-window trend, for regression/acceleration) -- both are "fit a
 * line to this series and say whether it's rising, falling or flat"
 * over some window, so the classification logic exists in exactly one
 * place. `polarity` says whether a rising value is an improvement (e.g.
 * CTL) or a decline (e.g. pace, where a lower number is faster).
 */
export function classifySeries(series: MetricSeriesPoint[], polarity: MetricPolarity): TrendClassification | null {
  if (series.length < MIN_TREND_POINTS) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((p) => ({ x: toDayNumber(p.date), y: p.value }));
  const { slope, rSquared } = linearRegression(points);

  const meanValue = points.reduce((s, p) => s + p.y, 0) / points.length;
  const relativeSlope = meanValue !== 0 ? Math.abs(slope) / Math.abs(meanValue) : Math.abs(slope);

  let direction: TrendDirection;
  if (relativeSlope < STABLE_SLOPE_THRESHOLD_FRACTION) {
    direction = "stable";
  } else {
    const rising = slope > 0;
    direction = (polarity === "higher_is_better") === rising ? "improving" : "declining";
  }

  const confidence = Math.max(0, Math.min(1, rSquared)) * Math.min(1, series.length / TREND_CONFIDENCE_SATURATION_POINTS);

  return {
    direction,
    slopePerDay: slope,
    slopePerWeek: slope * 7,
    rSquared,
    confidence,
    pointCount: sorted.length,
    sorted,
  };
}
