import { metricResult, unavailableMetric, type MetricResult } from "../metrics";
import type { MetricSeriesPoint } from "./types";

export interface ThresholdProjection {
  metricName: string;
  projectedDate: string;
  projectedValue: number;
  slopePerDay: number;
  rSquared: number;
}

const MIN_POINTS_FOR_PROJECTION = 4;

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
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
  const intercept = meanY - slope * meanX;
  const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);
  return { slope, intercept, rSquared };
}

/**
 * Projects a metric `daysAhead` into the future via linear trend
 * extrapolation: least-squares regression over its history, evaluated at
 * a future day. Confidence combines how well the line already fits the
 * history (rSquared) with how far ahead we're projecting relative to the
 * span of history available -- projecting 90 days from just 14 days of
 * history is far less reliable than from 180 days, so confidence decays
 * as (daysAhead / historySpanDays) grows.
 */
export function predictThresholdEvolution(
  metricName: string,
  history: MetricSeriesPoint[],
  daysAhead: number,
): MetricResult<ThresholdProjection> {
  const requiredInputs = [`${metricName} history (>= ${MIN_POINTS_FOR_PROJECTION} points)`];
  if (history.length < MIN_POINTS_FOR_PROJECTION) {
    return unavailableMetric(requiredInputs, ["not enough history for a projection"]);
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((p) => ({ x: toDayNumber(p.date), y: p.value }));
  const { slope, intercept, rSquared } = linearRegression(points);

  const lastDay = points[points.length - 1].x;
  const projectedDay = lastDay + daysAhead;
  const projectedValue = slope * projectedDay + intercept;

  const historySpanDays = Math.max(1, lastDay - points[0].x);
  const extrapolationRatio = daysAhead / historySpanDays;
  const confidence = Math.max(0, Math.min(1, rSquared)) * Math.max(0, 1 - extrapolationRatio);

  const dataQuality: "high" | "medium" | "low" = confidence >= 0.6 ? "high" : confidence >= 0.3 ? "medium" : "low";
  const missingInputs = extrapolationRatio > 1 ? ["projecting further ahead than the available history span"] : [];

  return metricResult(
    { metricName, projectedDate: fromDayNumber(projectedDay), projectedValue, slopePerDay: slope, rSquared },
    confidence,
    dataQuality,
    requiredInputs,
    missingInputs,
  );
}

export function predictLT1Evolution(history: MetricSeriesPoint[], daysAhead: number): MetricResult<ThresholdProjection> {
  return predictThresholdEvolution("LT1", history, daysAhead);
}

export function predictLT2Evolution(history: MetricSeriesPoint[], daysAhead: number): MetricResult<ThresholdProjection> {
  return predictThresholdEvolution("LT2", history, daysAhead);
}

/** "Critical Power Projection" per DOMAIN_MODEL.md's own Prediction example -- same linear trend extrapolation. */
export function predictCriticalPowerProjection(
  history: MetricSeriesPoint[],
  daysAhead: number,
): MetricResult<ThresholdProjection> {
  return predictThresholdEvolution("Critical Power", history, daysAhead);
}
