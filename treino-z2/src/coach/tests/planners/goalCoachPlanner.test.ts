import { describe, expect, it } from "vitest";
import { trackGoalProgress } from "../../planners/goalCoachPlanner";
import type { GoalCoachInput } from "../../planners/goalCoachPlanner";
import type { Alert } from "../../types/alert";
import type { GoalPredictionValue, Prediction } from "../../../prediction";

const generatedAt = "2026-07-18";

function makePrediction(overrides: Partial<Prediction<GoalPredictionValue>> = {}): Prediction<GoalPredictionValue> {
  return {
    id: "prediction:goal_achievement:2026-07-18:goal-1",
    predictionType: "goal_achievement",
    category: "goal",
    value: { probability: 0.7, estimatedAchievementDate: "2026-09-01", limitingFactors: [] },
    confidence: 0.6,
    lowerBound: 0.4,
    upperBound: 1,
    supportingMetrics: [],
    supportingInsights: [],
    assumptions: [],
    generatedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-25T00:00:00.000Z",
    ...overrides,
  };
}

function input(overrides: Partial<GoalCoachInput> = {}): GoalCoachInput {
  return {
    goalId: "goal-1",
    goalLabel: "Sub-20 5K",
    baselineValue: 1300,
    currentValue: 1250,
    targetValue: 1200,
    polarity: "lower_is_better",
    goalPrediction: makePrediction(),
    activeAlerts: [],
    ...overrides,
  };
}

describe("trackGoalProgress", () => {
  it("computes progressPercent as how far current has moved from baseline toward target", () => {
    // lower_is_better: baseline 1300, current 1250, target 1200 -> 50/100 = 50%
    const progress = trackGoalProgress(input(), generatedAt);
    expect(progress.progressPercent).toBeCloseTo(50, 5);
  });

  it("computes progressPercent for a higher_is_better goal (e.g. FTP)", () => {
    const progress = trackGoalProgress(input({ polarity: "higher_is_better", baselineValue: 200, currentValue: 225, targetValue: 250 }), generatedAt);
    expect(progress.progressPercent).toBeCloseTo(50, 5);
  });

  it("clamps progressPercent to [0, 100] even if current has overshot the target", () => {
    const progress = trackGoalProgress(input({ currentValue: 1100 }), generatedAt); // already faster than target
    expect(progress.progressPercent).toBe(100);
  });

  it("returns 100 when baseline already equals target", () => {
    const progress = trackGoalProgress(input({ baselineValue: 1200, targetValue: 1200 }), generatedAt);
    expect(progress.progressPercent).toBe(100);
  });

  it("passes estimatedCompletionDate and onTrack through from the prediction, unchanged", () => {
    const progress = trackGoalProgress(input(), generatedAt);
    expect(progress.estimatedCompletionDate).toBe("2026-09-01");
    expect(progress.onTrack).toBe(true);
  });

  it("marks onTrack false when the prediction's probability is below 50%", () => {
    const progress = trackGoalProgress(input({ goalPrediction: makePrediction({ value: { probability: 0.3, estimatedAchievementDate: null, limitingFactors: [] } }) }), generatedAt);
    expect(progress.onTrack).toBe(false);
    expect(progress.estimatedCompletionDate).toBeNull();
  });

  it("handles a null goalPrediction gracefully (no prediction available yet)", () => {
    const progress = trackGoalProgress(input({ goalPrediction: null }), generatedAt);
    expect(progress.onTrack).toBe(false);
    expect(progress.estimatedCompletionDate).toBeNull();
    expect(progress.supportingPredictions).toEqual([]);
  });

  it("folds the prediction's limitingFactors and relevant active alerts into currentObstacles", () => {
    const alerts: Alert[] = [
      { id: "alert:1", severity: "critical", category: "injury_risk", title: "High Injury Risk", description: "Injury risk is elevated.", actionRequired: "Rest.", generatedAt },
      { id: "alert:2", severity: "info", category: "personal_record", title: "PR!", description: "New PR.", actionRequired: null, generatedAt }, // not an obstacle category
    ];
    const progress = trackGoalProgress(
      input({ goalPrediction: makePrediction({ value: { probability: 0.7, estimatedAchievementDate: "2026-09-01", limitingFactors: ["trend is inconsistent"] } }), activeAlerts: alerts }),
      generatedAt,
    );
    expect(progress.currentObstacles).toContain("trend is inconsistent");
    expect(progress.currentObstacles).toContain("Injury risk is elevated.");
    expect(progress.currentObstacles).not.toContain("New PR.");
  });

  it("carries goalId/goalLabel/generatedAt through, and records the prediction id in supportingPredictions", () => {
    const progress = trackGoalProgress(input(), generatedAt);
    expect(progress.goalId).toBe("goal-1");
    expect(progress.goalLabel).toBe("Sub-20 5K");
    expect(progress.generatedAt).toBe(generatedAt);
    expect(progress.supportingPredictions).toEqual(["prediction:goal_achievement:2026-07-18:goal-1"]);
  });
});
