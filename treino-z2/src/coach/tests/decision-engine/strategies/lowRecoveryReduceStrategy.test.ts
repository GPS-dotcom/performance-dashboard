import { describe, expect, it } from "vitest";
import { lowRecoveryReduceStrategy } from "../../../decision-engine/strategies/lowRecoveryReduceStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("lowRecoveryReduceStrategy", () => {
  it("applies when recovery score is below 50", () => {
    expect(lowRecoveryReduceStrategy.appliesTo(signals({ recoveryScore: 49 }))).toBe(true);
  });

  it("does not apply at or above 50, or when recovery score is unknown", () => {
    expect(lowRecoveryReduceStrategy.appliesTo(signals({ recoveryScore: 50 }))).toBe(false);
    expect(lowRecoveryReduceStrategy.appliesTo(signals({ recoveryScore: null }))).toBe(false);
  });

  it("decides reduce_load", () => {
    const decision = lowRecoveryReduceStrategy.decide(signals({ recoveryScore: 40 }));
    expect(decision.action).toBe("reduce_load");
    expect(decision.supportingMetrics).toEqual(["recovery_score"]);
  });
});
