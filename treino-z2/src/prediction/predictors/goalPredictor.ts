import { goalProbabilityModel } from "../algorithms/goalProbabilityModel";
import { unavailableModelOutput } from "../models/predictionModel";
import { buildPrediction } from "./shared/predictionBuilder";
import type { GoalPredictionValue } from "../algorithms/goalProbabilityModel";
import type { GoalInput } from "../types/goalInput";
import type { Prediction } from "../types/prediction";
import type { MetricPolarity, MetricSeriesPoint } from "../types/seriesTypes";

/**
 * Goal Predictor (09_PREDICTION_ENGINE.md: "Goal achievement forecasts").
 * "probabilidade de atingir meta", "data estimada" and "fatores
 * limitantes" are produced together, as one forecast -- see
 * algorithms/goalProbabilityModel.ts for why they're one model rather
 * than three independent ones.
 */
export function predictGoalAchievement(
  goal: GoalInput,
  valueHistory: MetricSeriesPoint[],
  polarity: MetricPolarity,
  today: string,
): Prediction<GoalPredictionValue> {
  const modelOutput =
    goal.targetValue == null
      ? unavailableModelOutput<GoalPredictionValue>(["goal has no numeric target value to project against"])
      : goalProbabilityModel.predict({ valueHistory, targetValue: goal.targetValue, polarity, targetDate: goal.targetDate, today });

  return buildPrediction({
    kind: "goal_achievement",
    predictionType: "goal_achievement",
    category: "goal",
    modelOutput,
    supportingMetrics: ["goal_relevant_metric_history"],
    generatedAt: today,
    idSuffix: goal.id,
  });
}
