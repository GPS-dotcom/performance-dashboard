import { describe, expect, it } from "vitest";
import { injuryRiskRestStrategy } from "../../../decision-engine/strategies/injuryRiskRestStrategy";
import type { TrainingSignals } from "../../../types/signals";

function signals(overrides: Partial<TrainingSignals> = {}): TrainingSignals {
  return { recoveryScore: null, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: null, injuryRiskLevel: null, ...overrides };
}

describe("injuryRiskRestStrategy", () => {
  it("applies only when injury risk is high", () => {
    expect(injuryRiskRestStrategy.appliesTo(signals({ injuryRiskLevel: "high" }))).toBe(true);
    expect(injuryRiskRestStrategy.appliesTo(signals({ injuryRiskLevel: "moderate" }))).toBe(false);
    expect(injuryRiskRestStrategy.appliesTo(signals({ injuryRiskLevel: null }))).toBe(false);
  });

  it("decides full_rest with a fixed confidence and the injury_risk_level supporting metric", () => {
    const decision = injuryRiskRestStrategy.decide(signals({ injuryRiskLevel: "high" }));
    expect(decision.action).toBe("full_rest");
    expect(decision.confidence).toBe(0.85);
    expect(decision.supportingMetrics).toEqual(["injury_risk_level"]);
  });
});
