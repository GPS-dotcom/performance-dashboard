import { describe, expect, it } from "vitest";
import { goodRecoveryMaintainStrategy } from "../../../decision-engine/strategies/goodRecoveryMaintainStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("goodRecoveryMaintainStrategy", () => {
  it("applies when recovery score is 70 or above", () => {
    expect(goodRecoveryMaintainStrategy.appliesTo(signals({ recoveryScore: 70 }))).toBe(true);
  });

  it("does not apply below 70, or when recovery score is unknown", () => {
    expect(goodRecoveryMaintainStrategy.appliesTo(signals({ recoveryScore: 69 }))).toBe(false);
    expect(goodRecoveryMaintainStrategy.appliesTo(signals({ recoveryScore: null }))).toBe(false);
  });

  it("decides maintain_load", () => {
    const decision = goodRecoveryMaintainStrategy.decide(signals({ recoveryScore: 75 }));
    expect(decision.action).toBe("maintain_load");
    expect(decision.supportingMetrics).toEqual(["recovery_score"]);
  });
});
