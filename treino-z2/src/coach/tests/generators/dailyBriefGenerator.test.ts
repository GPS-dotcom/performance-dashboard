import { describe, expect, it } from "vitest";
import { generateDailyBrief, scoreLabel } from "../../generators/dailyBriefGenerator";
import type { DailyBriefGeneratorInput } from "../../generators/dailyBriefGenerator";

function input(overrides: Partial<DailyBriefGeneratorInput> = {}): DailyBriefGeneratorInput {
  return {
    date: "2026-07-18",
    recoveryScore: 75,
    fitnessScore: 60,
    trainingSignals: { recoveryScore: 75, recoveryScoreTrend: null, atlTrend: null, hrDriftTrend: null, lt1Trend: null, tsb: 5, injuryRiskLevel: null },
    recoverySignals: { recoveryScore: 75, acwr: 1.0, hrDriftTrend: null, hasWearableRecoveryData: true },
    alertSignals: {
      injuryRiskLevel: null,
      tsb: 5,
      recoveryScore: 75,
      acwr: 1.0,
      performanceTrendDeclining: false,
      consistencyDeclining: false,
      missedWeeksEvidence: null,
      newPersonalBest: null,
    },
    keyInsightSummaries: [],
    upcomingRace: null,
    ...overrides,
  };
}

describe("scoreLabel", () => {
  it("categorizes scores into the documented bands", () => {
    expect(scoreLabel(null)).toBe("unknown");
    expect(scoreLabel(90)).toBe("excellent");
    expect(scoreLabel(70)).toBe("good");
    expect(scoreLabel(50)).toBe("fair");
    expect(scoreLabel(20)).toBe("low");
  });
});

describe("generateDailyBrief", () => {
  it("includes both an intensity and any recovery recommendations in `recommendations`", () => {
    const brief = generateDailyBrief(input({ recoverySignals: { recoveryScore: 20, acwr: 1.0, hrDriftTrend: null, hasWearableRecoveryData: true } }));
    expect(brief.recommendations.some((r) => r.type === "intensity")).toBe(true);
    expect(brief.recommendations.some((r) => r.type === "recovery")).toBe(true);
  });

  it("reports keyChanges only for trends that actually moved", () => {
    const brief = generateDailyBrief(input({ trainingSignals: { ...input().trainingSignals, recoveryScoreTrend: "increasing", atlTrend: "stable" } }));
    expect(brief.keyChanges).toContain("Recovery Score increased.");
    expect(brief.keyChanges.some((c) => c.includes("Fatigue"))).toBe(false); // "stable" isn't reported as a change
  });

  it("surfaces critical alerts and priority-1 recommendations in attentionPoints", () => {
    const brief = generateDailyBrief(input({ alertSignals: { ...input().alertSignals, injuryRiskLevel: "high" }, trainingSignals: { ...input().trainingSignals, injuryRiskLevel: "high" } }));
    expect(brief.attentionPoints.length).toBeGreaterThan(0);
  });

  it("folds keyInsightSummaries into recentEvolution alongside the recovery/fitness labels", () => {
    const brief = generateDailyBrief(input({ keyInsightSummaries: ["Fitness is improving."] }));
    expect(brief.recentEvolution).toContain("Fitness is improving.");
    expect(brief.recentEvolution).toContain("Recovery is good.");
  });

  it("produces a critical-alert summary sentence and lowers confidence when a critical alert fires", () => {
    const normal = generateDailyBrief(input());
    const critical = generateDailyBrief(input({ alertSignals: { ...input().alertSignals, injuryRiskLevel: "high" }, trainingSignals: { ...input().trainingSignals, injuryRiskLevel: "high" } }));
    expect(critical.summary).toContain("attention needed");
    expect(critical.confidenceLevel).toBeLessThanOrEqual(0.6);
    expect(critical.confidenceLevel).toBeLessThanOrEqual(normal.confidenceLevel);
  });

  it("computes raceCountdown from upcomingRace, or null when there is none", () => {
    const withRace = generateDailyBrief(input({ upcomingRace: { name: "Chicago Marathon", date: "2026-10-11" } }));
    expect(withRace.raceCountdown).toEqual({ raceName: "Chicago Marathon", daysUntil: 85 });

    const withoutRace = generateDailyBrief(input());
    expect(withoutRace.raceCountdown).toBeNull();
  });

  it("carries the date through unchanged", () => {
    expect(generateDailyBrief(input()).date).toBe("2026-07-18");
  });
});
