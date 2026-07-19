import { describe, expect, it } from "vitest";
import { criticalFatigueRecoveryStrategy } from "../../../decision-engine/strategies/criticalFatigueRecoveryStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("criticalFatigueRecoveryStrategy", () => {
  it("applies when recovery score is critically low", () => {
    expect(criticalFatigueRecoveryStrategy.appliesTo(signals({ recoveryScore: 20 }))).toBe(true);
  });

  it("applies when TSB is critically negative", () => {
    expect(criticalFatigueRecoveryStrategy.appliesTo(signals({ tsb: -35 }))).toBe(true);
  });

  it("does not apply when neither signal is critical", () => {
    expect(criticalFatigueRecoveryStrategy.appliesTo(signals({ recoveryScore: 60, tsb: -10 }))).toBe(false);
  });

  it("decides active_recovery, with supportingMetrics reflecting exactly which signals triggered it", () => {
    const bothDecision = criticalFatigueRecoveryStrategy.decide(signals({ recoveryScore: 20, tsb: -35 }));
    expect(bothDecision.action).toBe("active_recovery");
    expect(bothDecision.supportingMetrics).toEqual(["recovery_score", "tsb"]);

    const onlyRecovery = criticalFatigueRecoveryStrategy.decide(signals({ recoveryScore: 20 }));
    expect(onlyRecovery.supportingMetrics).toEqual(["recovery_score"]);
  });
});
