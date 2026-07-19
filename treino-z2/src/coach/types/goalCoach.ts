/**
 * Goal Coach's output: "acompanhamento de metas, progresso, estimativa de
 * conclusão, obstáculos atuais." Wraps the Prediction Engine's
 * `goal_achievement` Prediction (probability, estimatedAchievementDate,
 * limitingFactors) in a coaching-facing view, adding `progressPercent`
 * (a coaching interpretation, not a metric or a new prediction -- see
 * planners/goalCoachPlanner.ts) and any currently-active alerts relevant
 * to the goal.
 */
export interface GoalProgress {
  goalId: string;
  goalLabel: string | null;
  /** 0-100: how far the tracked metric has moved from its baseline toward the target. */
  progressPercent: number;
  /** From the Prediction Engine's goal_achievement Prediction, passed through unchanged. */
  estimatedCompletionDate: string | null;
  /** From the Prediction Engine's goal_achievement Prediction's probability >= 0.5, passed through as a boolean. */
  onTrack: boolean;
  currentObstacles: string[];
  supportingPredictions: string[];
  generatedAt: string;
}
