import { describe, expect, it } from "vitest";
import { generateWeeklyReport } from "../../generators/weeklyReportGenerator";
import type { WeeklyReportInput } from "../../types/weeklyReport";

const generatedAt = "2026-07-19";

function input(overrides: Partial<WeeklyReportInput> = {}): WeeklyReportInput {
  return {
    weekStart: "2026-07-13",
    weekEnd: "2026-07-19",
    sessionsCompleted: 5,
    sessionsPlanned: 5,
    totalDistanceKm: 50,
    ctlChange: 2,
    atlChange: 1,
    averageTsb: 0,
    consistencyRatio: 1.0,
    keyInsightSummaries: [],
    recommendations: [],
    newPersonalBests: [],
    ...overrides,
  };
}

describe("generateWeeklyReport", () => {
  it("lists a strength for fitness growth and excellent consistency", () => {
    const report = generateWeeklyReport(input(), generatedAt);
    expect(report.strengths.some((s) => s.includes("Fitness"))).toBe(true);
    expect(report.strengths.some((s) => s.includes("consistency"))).toBe(true);
  });

  it("lists a weakness for fitness decline, low consistency, and elevated fatigue", () => {
    const report = generateWeeklyReport(input({ ctlChange: -3, consistencyRatio: 0.3, averageTsb: -25, sessionsCompleted: 2 }), generatedAt);
    expect(report.weaknesses.some((w) => w.includes("declined"))).toBe(true);
    expect(report.weaknesses.some((w) => w.includes("Consistency was low"))).toBe(true);
    expect(report.weaknesses.some((w) => w.includes("Fatigue"))).toBe(true);
  });

  it("includes new personal bests as strengths", () => {
    const report = generateWeeklyReport(input({ newPersonalBests: ["5k in 19:30"] }), generatedAt);
    expect(report.strengths).toContain("New personal best: 5k in 19:30.");
  });

  it("prioritizes recovery next week when fatigue was elevated", () => {
    const report = generateWeeklyReport(input({ averageTsb: -25 }), generatedAt);
    expect(report.nextWeekPriorities).toContain("Prioritize recovery before resuming quality sessions.");
  });

  it("prioritizes rebuilding consistency when it was low", () => {
    const report = generateWeeklyReport(input({ consistencyRatio: 0.3 }), generatedAt);
    expect(report.nextWeekPriorities).toContain("Rebuild consistency with a realistic, achievable session count.");
  });

  it("falls back to a generic priority when nothing specific applies", () => {
    const report = generateWeeklyReport(input({ ctlChange: 0 }), generatedAt);
    expect(report.nextWeekPriorities).toEqual(["Maintain the current balance of load and recovery."]);
  });

  it("passes recommendations through unchanged rather than generating new ones", () => {
    const recommendations = [
      {
        id: "recommendation:x:2026-07-19",
        type: "intensity" as const,
        priority: 1 as const,
        title: "X",
        description: "d",
        reasoning: "r",
        supportingMetrics: [],
        supportingInsights: [],
        supportingPredictions: [],
        confidence: 0.5,
        createdAt: generatedAt,
      },
    ];
    const report = generateWeeklyReport(input({ recommendations }), generatedAt);
    expect(report.recommendations).toBe(recommendations);
  });

  it("summarizes a clean week positively when there are no weaknesses", () => {
    const report = generateWeeklyReport(input(), generatedAt);
    expect(report.summary).toContain("solid week");
  });

  it("carries weekStart/weekEnd/generatedAt through unchanged", () => {
    const report = generateWeeklyReport(input(), generatedAt);
    expect(report.weekStart).toBe("2026-07-13");
    expect(report.weekEnd).toBe("2026-07-19");
    expect(report.generatedAt).toBe(generatedAt);
  });
});
