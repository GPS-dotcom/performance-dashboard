import { describe, expect, it } from "vitest";
import { generateDailyBrief } from "../dailyBrief";
import type { DailyBriefInput } from "../dailyBrief";

function input(overrides: Partial<DailyBriefInput> = {}): DailyBriefInput {
  return {
    date: "2026-07-18",
    recoveryScore: 75,
    fitnessScore: 60,
    trainingSignals: {
      recoveryScore: 75,
      recoveryScoreTrend: null,
      atlTrend: null,
      hrDriftTrend: null,
      lt1Trend: null,
      tsb: 5,
      injuryRiskLevel: "low",
    },
    alertSignals: {
      injuryRiskLevel: "low",
      tsb: 5,
      recoveryScore: 75,
      acwr: 1.0,
      performanceTrendDeclining: false,
    },
    keyInsightSummaries: [],
    upcomingRace: null,
    ...overrides,
  };
}

describe("generateDailyBrief", () => {
  it("includes every field the spec requires", () => {
    const brief = generateDailyBrief(input());
    expect(brief).toHaveProperty("date");
    expect(brief).toHaveProperty("status");
    expect(brief).toHaveProperty("recovery");
    expect(brief).toHaveProperty("fitness");
    expect(brief).toHaveProperty("trainingRecommendation");
    expect(brief).toHaveProperty("keyInsights");
    expect(brief).toHaveProperty("raceCountdown");
    expect(brief).toHaveProperty("warnings");
    expect(brief).toHaveProperty("opportunities");
    expect(brief).toHaveProperty("confidenceLevel");
  });

  it("labels recovery and fitness scores consistently", () => {
    const brief = generateDailyBrief(input({ recoveryScore: 85, fitnessScore: 25 }));
    expect(brief.recovery.label).toBe("excellent");
    expect(brief.fitness.label).toBe("low");
  });

  it("computes a race countdown when an upcoming race is given", () => {
    const brief = generateDailyBrief(input({ upcomingRace: { name: "Chicago Marathon", date: "2026-10-11" } }));
    expect(brief.raceCountdown).toEqual({ raceName: "Chicago Marathon", daysUntil: 85 });
  });

  it("has no race countdown when no race is set", () => {
    expect(generateDailyBrief(input()).raceCountdown).toBeNull();
  });

  it("surfaces warnings from detectAlerts and reduces overall confidence when one is critical", () => {
    const brief = generateDailyBrief(input({ alertSignals: { ...input().alertSignals, injuryRiskLevel: "high" } }));
    expect(brief.warnings.some((w) => w.kind === "high_injury_risk" && w.severity === "critical")).toBe(true);
    expect(brief.status).toMatch(/attention needed/);
    expect(brief.confidenceLevel).toBeLessThanOrEqual(0.6);
  });

  it("lists opportunities when LT1/HR Drift are trending favorably", () => {
    const brief = generateDailyBrief(
      input({
        trainingSignals: { ...input().trainingSignals, lt1Trend: "increasing", hrDriftTrend: "decreasing" },
      }),
    );
    expect(brief.opportunities.length).toBe(2);
  });

  it("passes through the training recommendation from recommendTraining unchanged", () => {
    const brief = generateDailyBrief(
      input({
        trainingSignals: {
          recoveryScore: null,
          recoveryScoreTrend: "decreasing",
          atlTrend: "increasing",
          hrDriftTrend: "increasing",
          lt1Trend: null,
          tsb: null,
          injuryRiskLevel: null,
        },
      }),
    );
    expect(brief.trainingRecommendation.recommendation).toBe("Easy Run");
    expect(brief.trainingRecommendation.confidence).toBe(0.92);
  });
});
