import { heuristicBound } from "./shared/confidenceInterval";
import { linearRegression } from "./shared/linearRegression";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";
import type { MetricPolarity, MetricSeriesPoint } from "../types/seriesTypes";

export interface GoalModelInput {
  /** The metric this goal is measured on (e.g. predicted race time history in seconds, or FTP history in watts). */
  valueHistory: MetricSeriesPoint[];
  /** The goal's numeric target, in the same unit as valueHistory. */
  targetValue: number;
  /** Whether reaching the goal means the value going down (race time) or up (FTP). */
  polarity: MetricPolarity;
  /** ISO date the goal is due by. */
  targetDate: string;
  /** ISO date to project from -- "today". */
  today: string;
}

export interface GoalPredictionValue {
  /** 0-1. */
  probability: number;
  /** ISO date the current trend would reach the target on, or null if the trend never reaches it. */
  estimatedAchievementDate: string | null;
  limitingFactors: string[];
}

const MIN_POINTS = 4;
// Logistic steepness: how quickly probability moves away from 50% as the
// projected value's relative margin to the target grows. k=6 means a
// projected value 20% better/worse than the target maps to roughly
// 1/(1+e^-1.2) ~= 77% / 23% -- a deliberately smooth, monotonic mapping
// from "how far off track" to "how likely", not a lookup table.
const LOGISTIC_STEEPNESS = 6;
const MAX_PROBABILITY_HALF_WIDTH = 0.3;

function toDayNumber(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

function fromDayNumber(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/**
 * Predicts the probability of reaching a numeric goal by its target date,
 * the date the current trend would reach it, and the limiting factors
 * behind that estimate -- all three as facets of one forecast (a
 * probability, a date and its caveats naturally belong together, rather
 * than three independent models asked the same underlying question).
 *
 * Method: fits a least-squares trend to `valueHistory` (shared/linearRegression.ts,
 * the same primitive linearTrendModel uses), projects it to `targetDate`,
 * and converts how far that projection lands from `targetValue` (as a
 * fraction of the target) into a probability via a logistic function
 * centered at 0 margin = 50%. `estimatedAchievementDate` solves the same
 * line for the day it crosses `targetValue` exactly, when the trend is
 * moving toward the goal at all.
 */
export function predictGoalAchievement(input: GoalModelInput): ModelOutput<GoalPredictionValue> {
  const { valueHistory, targetValue, polarity, targetDate, today } = input;
  if (valueHistory.length < MIN_POINTS) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: [`fewer than ${MIN_POINTS} data points of goal-relevant history`] };
  }

  const limitingFactors: string[] = [];
  const todayDay = toDayNumber(today);
  const targetDay = toDayNumber(targetDate);
  const daysUntilTarget = targetDay - todayDay;
  if (daysUntilTarget <= 0) limitingFactors.push("target date has already passed");

  const sorted = [...valueHistory].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((p) => ({ x: toDayNumber(p.date), y: p.value }));
  const { slope, intercept, rSquared } = linearRegression(points);

  const projectedValueAtTarget = slope * targetDay + intercept;
  const higherIsBetter = polarity === "higher_is_better";
  const rawMargin = higherIsBetter ? (projectedValueAtTarget - targetValue) / Math.abs(targetValue || 1) : (targetValue - projectedValueAtTarget) / Math.abs(targetValue || 1);
  const probability = 1 / (1 + Math.exp(-LOGISTIC_STEEPNESS * rawMargin));

  const movingTowardGoal = higherIsBetter ? slope > 0 : slope < 0;
  let estimatedAchievementDate: string | null = null;
  if (movingTowardGoal && slope !== 0) {
    const crossingDay = (targetValue - intercept) / slope;
    estimatedAchievementDate = fromDayNumber(Math.ceil(crossingDay));
  } else {
    limitingFactors.push("current trend is not moving toward the goal -- at this rate the target is never reached");
  }

  const lastHistoryDay = points[points.length - 1].x;
  const historySpanDays = Math.max(1, lastHistoryDay - points[0].x);
  const extrapolationRatio = Math.max(0, targetDay - lastHistoryDay) / historySpanDays;
  if (extrapolationRatio > 1) limitingFactors.push("target date is far beyond the available history's timespan -- limited basis to project this far ahead");
  if (rSquared < 0.3) limitingFactors.push("recent performance trend is inconsistent (low fit quality) -- the projection carries more uncertainty than usual");

  const confidence = Math.max(0, Math.min(1, rSquared)) * Math.max(0.1, 1 - Math.min(1, extrapolationRatio));
  const bound = heuristicBound(probability, confidence, MAX_PROBABILITY_HALF_WIDTH);

  return {
    value: { probability, estimatedAchievementDate, limitingFactors },
    confidence,
    lowerBound: Math.max(0, bound.lowerBound),
    upperBound: Math.min(1, bound.upperBound),
    assumptions: ["assumes the current linear trend in the goal-relevant metric continues unchanged through the target date"],
    missingInputs: [],
  };
}

export const goalProbabilityModel: PredictionModel<GoalModelInput, GoalPredictionValue> = {
  modelId: "linear-trend-goal-probability",
  version: "1.0.0",
  predict: predictGoalAchievement,
};
