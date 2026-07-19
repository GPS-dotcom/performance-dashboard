import type { GoalPredictionValue, Prediction } from "../../prediction";
import type { Alert } from "../types/alert";
import type { GoalProgress } from "../types/goalCoach";

/**
 * Goal Coach, per this task's 4 explicit requested facets:
 * "acompanhamento de metas" (tracking), "progresso" (progressPercent),
 * "estimativa de conclusão" (estimatedCompletionDate), "obstáculos
 * atuais" (currentObstacles). The estimated completion date and the
 * on-track probability are read directly from the Prediction Engine's
 * `goal_achievement` Prediction, never recomputed -- "O Coach Engine NÃO
 * gera previsões." `progressPercent` is the one number this module adds:
 * a coaching interpretation of how far the tracked metric has already
 * moved from its baseline toward the target, not a forecast of the
 * future.
 */
export interface GoalCoachInput {
  goalId: string;
  goalLabel: string | null;
  /** The tracked metric's value when goal tracking started. */
  baselineValue: number;
  /** The tracked metric's current value. */
  currentValue: number;
  targetValue: number;
  polarity: "higher_is_better" | "lower_is_better";
  /** From the Prediction Engine's Goal Predictor -- consumed, never computed here. Null when no prediction is available yet. */
  goalPrediction: Prediction<GoalPredictionValue> | null;
  /** Currently-active Coach Engine alerts, so obstacles reflect what's actually happening right now (e.g. an active injury-risk alert), not just the prediction's own limiting factors. */
  activeAlerts: Alert[];
}

/** Alert categories that plausibly stand in the way of a training goal -- folded into `currentObstacles` alongside the prediction's own `limitingFactors`. */
const OBSTACLE_ALERT_CATEGORIES: Alert["category"][] = ["injury_risk", "elevated_fatigue", "overtraining_risk", "consistency_loss"];

/**
 * How far `currentValue` has moved from `baselineValue` toward
 * `targetValue`, as a percentage, clamped to [0, 100]. Falls back to 100
 * when baseline already equals target (nothing left to progress toward).
 */
function computeProgressPercent(baselineValue: number, currentValue: number, targetValue: number, polarity: "higher_is_better" | "lower_is_better"): number {
  const totalDistance = polarity === "higher_is_better" ? targetValue - baselineValue : baselineValue - targetValue;
  if (totalDistance === 0) return 100;

  const distanceCovered = polarity === "higher_is_better" ? currentValue - baselineValue : baselineValue - currentValue;
  return Math.max(0, Math.min(100, (distanceCovered / totalDistance) * 100));
}

export function trackGoalProgress(input: GoalCoachInput, generatedAt: string): GoalProgress {
  const { goalId, goalLabel, baselineValue, currentValue, targetValue, polarity, goalPrediction, activeAlerts } = input;

  const progressPercent = computeProgressPercent(baselineValue, currentValue, targetValue, polarity);
  const obstaclesFromAlerts = activeAlerts.filter((a) => OBSTACLE_ALERT_CATEGORIES.includes(a.category)).map((a) => a.description);
  const currentObstacles = [...(goalPrediction?.value?.limitingFactors ?? []), ...obstaclesFromAlerts];

  return {
    goalId,
    goalLabel,
    progressPercent,
    estimatedCompletionDate: goalPrediction?.value?.estimatedAchievementDate ?? null,
    onTrack: (goalPrediction?.value?.probability ?? 0) >= 0.5,
    currentObstacles,
    supportingPredictions: goalPrediction ? [goalPrediction.id] : [],
    generatedAt,
  };
}
