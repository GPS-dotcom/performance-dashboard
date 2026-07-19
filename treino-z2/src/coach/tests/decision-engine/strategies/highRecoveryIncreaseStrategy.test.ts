import { describe, expect, it } from "vitest";
import { highRecoveryIncreaseStrategy } from "../../../decision-engine/strategies/highRecoveryIncreaseStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

const pattern: Partial<TrainingSignals> = { recoveryScore: 90, hrDriftTrend: "decreasing", lt1Trend: "increasing" };

describe("highRecoveryIncreaseStrategy", () => {
  it("applies only when all 3 signals in the exact pattern are present", () => {
    expect(highRecoveryIncreaseStrategy.appliesTo(signals(pattern))).toBe(true);
  });

  it("does not apply when recovery score is below the threshold, even with the other two signals present", () => {
    expect(highRecoveryIncreaseStrategy.appliesTo(signals({ ...pattern, recoveryScore: 80 }))).toBe(false);
  });

  it("does not apply when HR Drift or LT1 aren't trending the right way", () => {
    expect(highRecoveryIncreaseStrategy.appliesTo(signals({ ...pattern, hrDriftTrend: "increasing" }))).toBe(false);
    expect(highRecoveryIncreaseStrategy.appliesTo(signals({ ...pattern, lt1Trend: "decreasing" }))).toBe(false);
  });

  it("decides increase_load with the spec's literal 0.95 confidence for this exact worked example", () => {
    const decision = highRecoveryIncreaseStrategy.decide(signals(pattern));
    expect(decision.action).toBe("increase_load");
    expect(decision.confidence).toBe(0.95);
    expect(decision.supportingMetrics).toEqual(["recovery_score", "hr_drift", "lt1"]);
  });
});
