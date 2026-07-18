import { describe, expect, it } from "vitest";
import { analyzeWorkout } from "../workoutFeedback";
import type { WorkoutFeedbackInput } from "../workoutFeedback";

function input(overrides: Partial<WorkoutFeedbackInput> = {}): WorkoutFeedbackInput {
  return {
    plannedKind: "Threshold",
    plannedRtss: 80,
    actualRtss: 80,
    targetZone: "Z4",
    actualTargetZonePct: 70,
    hrDriftPercent: 2,
    ...overrides,
  };
}

describe("analyzeWorkout", () => {
  it("answers all six required questions for a well-executed session", () => {
    const feedback = analyzeWorkout(input());
    expect(feedback.goal).toBe("Complete a Threshold session targeting Z4.");
    expect(feedback.goalAchieved).toBe(true);
    expect(feedback.improvements.length).toBeGreaterThan(0);
    expect(feedback.trainingBlockImpact).toMatch(/on schedule/);
    expect(feedback.tomorrowAdjustment).toMatch(/planned schedule/);
    expect(feedback.confidence).toBe(0.8);
  });

  it("flags a session as not achieved when it came in well below plan", () => {
    const feedback = analyzeWorkout(input({ actualRtss: 30 })); // ratio 0.375, below BELOW_PLAN_MIN (0.6)
    expect(feedback.goalAchieved).toBe(false);
    expect(feedback.trainingBlockImpact).toMatch(/well below/);
    expect(feedback.tomorrowAdjustment).toMatch(/Investigate/);
  });

  it("flags a session as harder than planned when it exceeded the well-executed band", () => {
    const feedback = analyzeWorkout(input({ actualRtss: 100 })); // ratio 1.25
    expect(feedback.goalAchieved).toBe(false);
    expect(feedback.trainingBlockImpact).toMatch(/more load than planned/);
    expect(feedback.tomorrowAdjustment).toMatch(/easier session/);
  });

  it("treats a moderate shortfall as below plan but not concerning", () => {
    const feedback = analyzeWorkout(input({ actualRtss: 56 })); // ratio 0.7, within [0.6, 0.85)
    expect(feedback.goalAchieved).toBe(false);
    expect(feedback.trainingBlockImpact).toMatch(/below plan/);
  });

  it("flags low target-zone time as a concern rather than an improvement", () => {
    const feedback = analyzeWorkout(input({ actualTargetZonePct: 30 }));
    expect(feedback.concerns.some((c) => c.includes("30%"))).toBe(true);
    expect(feedback.improvements.some((i) => i.includes("30%"))).toBe(false);
  });

  it("flags high HR drift as a concern", () => {
    const feedback = analyzeWorkout(input({ hrDriftPercent: 8 }));
    expect(feedback.concerns.some((c) => c.includes("HR Drift"))).toBe(true);
  });

  it("handles an unplanned session gracefully (no plannedRtss to compare against)", () => {
    const feedback = analyzeWorkout(input({ plannedKind: null, plannedRtss: null }));
    expect(feedback.goal).toBe("No workout was planned for this session.");
    expect(feedback.goalAchieved).toBeNull();
    expect(feedback.confidence).toBe(0.4);
  });
});
