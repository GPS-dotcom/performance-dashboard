import { describe, expect, it } from "vitest";
import { predictGoalAchievement } from "../../predictors/goalPredictor";
import type { GoalInput } from "../../types/goalInput";
import type { MetricSeriesPoint } from "../../types/seriesTypes";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

const decreasingRaceTimeHistory = series([1300, 1290, 1280, 1270, 1260, 1250]);
const today = "2026-06-08";

function makeGoal(overrides: Partial<GoalInput> = {}): GoalInput {
  return { id: "goal-1", kind: "5k", label: "Sub-20 5K", targetDate: "2026-06-11", targetValue: 1200, ...overrides };
}

describe("predictGoalAchievement", () => {
  it("reports category goal, predictionType goal_achievement, and an id suffixed with the goal id", () => {
    const prediction = predictGoalAchievement(makeGoal(), decreasingRaceTimeHistory, "lower_is_better", today);
    expect(prediction.category).toBe("goal");
    expect(prediction.predictionType).toBe("goal_achievement");
    expect(prediction.id).toBe(`prediction:goal_achievement:${today}:goal-1`);
    expect(prediction.value!.probability).toBeCloseTo(0.5, 5);
  });

  it("returns a null value (with a documented missing input) when the goal has no numeric target", () => {
    const prediction = predictGoalAchievement(makeGoal({ targetValue: null }), decreasingRaceTimeHistory, "lower_is_better", today);
    expect(prediction.value).toBeNull();
    expect(prediction.assumptions).toContain("missing/limited input: goal has no numeric target value to project against");
  });

  it("gives two different goals (same kind, same date) distinct ids via idSuffix", () => {
    const a = predictGoalAchievement(makeGoal({ id: "goal-a" }), decreasingRaceTimeHistory, "lower_is_better", today);
    const b = predictGoalAchievement(makeGoal({ id: "goal-b" }), decreasingRaceTimeHistory, "lower_is_better", today);
    expect(a.id).not.toBe(b.id);
  });
});
