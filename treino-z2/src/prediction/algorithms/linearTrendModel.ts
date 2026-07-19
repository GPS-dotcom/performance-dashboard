import { regressionPredictionInterval } from "./shared/confidenceInterval";
import { linearRegression } from "./shared/linearRegression";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";
import type { MetricSeriesPoint } from "../types/seriesTypes";

export interface TrendModelInput {
  series: MetricSeriesPoint[];
  daysAhead: number;
}

export interface TrendModelValue {
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

/**
 * Generic linear-trend extrapolation: fits a least-squares line to
 * `series` and evaluates it `daysAhead` in the future. Shared by every
 * "evolution"-style prediction (CTL, Fitness Score, Running
 * Effectiveness, LT1, LT2, Critical Power, FTP) -- they're the same
 * statistical question ("if this metric keeps moving the way it has
 * been, where will it be on date X?") asked of 7 different Metrics
 * Engine outputs, so the extrapolation math exists in exactly one place.
 *
 * Confidence combines how well the line already fits the history
 * (rSquared) with how far ahead the projection reaches relative to the
 * span of history available -- projecting 90 days from just 14 days of
 * history is far less reliable than from 180 days, so confidence decays
 * as (daysAhead / historySpanDays) grows. The interval bound is a real
 * statistical prediction interval (see shared/confidenceInterval.ts),
 * not a heuristic band, since this algorithm is an actual OLS fit.
 */
export function predictLinearTrend(input: TrendModelInput): ModelOutput<TrendModelValue> {
  const { series, daysAhead } = input;
  if (series.length < MIN_POINTS_FOR_PROJECTION) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: [`fewer than ${MIN_POINTS_FOR_PROJECTION} data points`] };
  }

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((p) => ({ x: toDayNumber(p.date), y: p.value }));
  const { slope, intercept, rSquared, residualStdError, meanX, sumSquaredX, n } = linearRegression(points);

  const lastDay = points[points.length - 1].x;
  const projectedDay = lastDay + daysAhead;
  const projectedValue = slope * projectedDay + intercept;

  const historySpanDays = Math.max(1, lastDay - points[0].x);
  const extrapolationRatio = daysAhead / historySpanDays;
  const confidence = Math.max(0, Math.min(1, rSquared)) * Math.max(0, 1 - extrapolationRatio);

  const interval = regressionPredictionInterval(projectedValue, projectedDay, residualStdError, n, meanX, sumSquaredX);
  const missingInputs = extrapolationRatio > 1 ? ["projecting further ahead than the available history span"] : [];

  return {
    value: { projectedDate: fromDayNumber(projectedDay), projectedValue, slopePerDay: slope, rSquared },
    confidence,
    lowerBound: interval?.lowerBound ?? null,
    upperBound: interval?.upperBound ?? null,
    assumptions: ["assumes the current linear trend continues unchanged (no training block change, no injury/illness interruption)"],
    missingInputs,
  };
}

export const linearTrendModel: PredictionModel<TrendModelInput, TrendModelValue> = {
  modelId: "linear-trend-extrapolation",
  version: "1.0.0",
  predict: predictLinearTrend,
};
