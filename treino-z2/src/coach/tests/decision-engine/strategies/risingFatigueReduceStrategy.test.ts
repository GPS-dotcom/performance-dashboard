import { describe, expect, it } from "vitest";
import { risingFatigueReduceStrategy } from "../../../decision-engine/strategies/risingFatigueReduceStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

const pattern: Partial<TrainingSignals> = { atlTrend: "increasing", hrDriftTrend: "increasing", recoveryScoreTrend: "decreasing" };

describe("risingFatigueReduceStrategy", () => {
  it("applies only when all 3 signals in the exact pattern are present", () => {
    expect(risingFatigueReduceStrategy.appliesTo(signals(pattern))).toBe(true);
  });

  it("does not apply when any one signal in the pattern is missing", () => {
    expect(risingFatigueReduceStrategy.appliesTo(signals({ ...pattern, hrDriftTrend: "stable" }))).toBe(false);
    expect(risingFatigueReduceStrategy.appliesTo(signals({ ...pattern, atlTrend: null }))).toBe(false);
    expect(risingFatigueReduceStrategy.appliesTo(signals({ ...pattern, recoveryScoreTrend: "increasing" }))).toBe(false);
  });

  it("decides reduce_load with the spec's literal 0.92 confidence for this exact worked example", () => {
    const decision = risingFatigueReduceStrategy.decide(signals(pattern));
    expect(decision.action).toBe("reduce_load");
    expect(decision.confidence).toBe(0.92);
    expect(decision.supportingMetrics).toEqual(["atl", "hr_drift", "recovery_score"]);
  });
});
