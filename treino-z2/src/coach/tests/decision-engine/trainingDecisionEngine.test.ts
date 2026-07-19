import { describe, expect, it } from "vitest";
import { decideTrainingAction } from "../../decision-engine/trainingDecisionEngine";
import type { TrainingSignals } from "../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

const today = "2026-07-18";

describe("decideTrainingAction", () => {
  it("picks the highest-priority applicable strategy: injury risk wins over everything else", () => {
    // Also matches the critical-fatigue and low-recovery tiers, but injury risk must win.
    const decision = decideTrainingAction(signals({ injuryRiskLevel: "high", recoveryScore: 10, tsb: -40 }), today);
    expect(decision.action).toBe("full_rest");
    expect(decision.strategyUsed).toBe("injury_risk_rest");
  });

  it("falls through to critical fatigue when injury risk doesn't apply", () => {
    const decision = decideTrainingAction(signals({ recoveryScore: 10 }), today);
    expect(decision.action).toBe("active_recovery");
    expect(decision.strategyUsed).toBe("critical_fatigue_recovery");
  });

  it("falls all the way through to the default when nothing else applies", () => {
    const decision = decideTrainingAction(signals(), today);
    expect(decision.action).toBe("maintain_load");
    expect(decision.strategyUsed).toBe("default_maintain");
  });

  it("derives id from the chosen action and the date portion of generatedAt", () => {
    const decision = decideTrainingAction(signals(), "2026-07-18T10:00:00.000Z");
    expect(decision.id).toBe("decision:maintain_load:2026-07-18");
  });

  it("carries generatedAt through unchanged", () => {
    const decision = decideTrainingAction(signals(), today);
    expect(decision.generatedAt).toBe(today);
  });
});
