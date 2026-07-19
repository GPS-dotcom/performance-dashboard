import { describe, expect, it } from "vitest";
import { assembleWeeklyReport } from "../../hooks/assembleWeeklyReport";
import type { Activity, MetricsSnapshot } from "../../../types";

const today = "2026-07-19"; // Sunday; ISO week = 2026-07-13..2026-07-19

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Run",
    startDate: "2026-07-14T08:00:00Z",
    distanceM: 8000,
    movingTimeS: 2400,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: null,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

describe("assembleWeeklyReport", () => {
  it("returns null when there's no activity or metrics data for the current week", () => {
    const result = assembleWeeklyReport([], [], [], today);
    expect(result).toBeNull();
  });

  it("aggregates this week's sessions and distance, excluding activities from other weeks", () => {
    const activities = [makeActivity({ id: "in-week" }), makeActivity({ id: "before-week", startDate: "2026-07-01T08:00:00Z" })];
    const result = assembleWeeklyReport(activities, [], [], today);
    expect(result).not.toBeNull();
    expect(result!.summary).toBeDefined();
    expect(result!.evolution.some((line) => line.includes("1 session"))).toBe(true);
  });

  it("computes ctlChange/atlChange from the first and last snapshot within the week", () => {
    const history: MetricsSnapshot[] = [
      { date: "2026-07-13", ctl: 40, atl: 45, tsb: -5 },
      { date: "2026-07-19", ctl: 44, atl: 40, tsb: 4 },
      { date: "2026-07-01", ctl: 10, atl: 10, tsb: 0 }, // outside the week -- must not affect the delta
    ];
    const result = assembleWeeklyReport([], history, [], today);
    expect(result).not.toBeNull();
    expect(result!.evolution.some((line) => line.includes("increased by 4"))).toBe(true);
  });

  it("scopes the week correctly when today is a weekday, not just on a Sunday", () => {
    // 2026-07-15 is a Wednesday; its ISO week is still 2026-07-13..2026-07-19.
    const result = assembleWeeklyReport([makeActivity({ startDate: "2026-07-14T08:00:00Z" })], [], [], "2026-07-15");
    expect(result).not.toBeNull();
  });

  it("treats a null distanceM as zero distance instead of NaN", () => {
    const result = assembleWeeklyReport([makeActivity({ distanceM: null })], [], [], today);
    expect(result!.evolution.some((line) => line.includes("0.0km"))).toBe(true);
  });

  it("passes through the recommendations it's given without modifying them", () => {
    const recommendation = {
      id: "r1",
      type: "intensity" as const,
      priority: 3 as const,
      title: "Easy Run",
      description: "d",
      reasoning: "r",
      supportingMetrics: [],
      supportingInsights: [],
      supportingPredictions: [],
      confidence: 0.7,
      createdAt: "2026-07-18T10:00:00.000Z",
    };
    const result = assembleWeeklyReport([makeActivity()], [], [recommendation], today);
    expect(result!.recommendations).toEqual([recommendation]);
  });
});
