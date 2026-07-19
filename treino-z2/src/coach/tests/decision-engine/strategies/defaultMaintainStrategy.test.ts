import { describe, expect, it } from "vitest";
import { defaultMaintainStrategy } from "../../../decision-engine/strategies/defaultMaintainStrategy";
import type { TrainingSignals } from "../../../types/signals";

const emptySignals: TrainingSignals = {
  recoveryScore: null,
  recoveryScoreTrend: null,
  atlTrend: null,
  hrDriftTrend: null,
  lt1Trend: null,
  tsb: null,
  injuryRiskLevel: null,
};

describe("defaultMaintainStrategy", () => {
  it("always applies, regardless of signals", () => {
    expect(defaultMaintainStrategy.appliesTo(emptySignals)).toBe(true);
  });

  it("decides maintain_load with no supporting metrics and the base confidence", () => {
    const decision = defaultMaintainStrategy.decide(emptySignals);
    expect(decision.action).toBe("maintain_load");
    expect(decision.supportingMetrics).toEqual([]);
    expect(decision.confidence).toBe(0.6);
  });
});
