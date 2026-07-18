import { describe, expect, it } from "vitest";
import { assembleDailyBrief } from "../assembleDailyBrief";
import type { Activity, MetricsSnapshot } from "../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Run",
    startDate: "2026-07-10",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: 80,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

function metricsSeries(ctlValues: number[], startDate = "2026-06-01"): MetricsSnapshot[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return ctlValues.map((ctl, i) => ({
    date: new Date(start + i * 86400000).toISOString().slice(0, 10),
    ctl,
    atl: ctl + 10,
    tsb: -10,
  }));
}

describe("assembleDailyBrief", () => {
  it("returns a fully unavailable brief gracefully when there is no history at all", () => {
    const result = assembleDailyBrief([], [], null, "2026-07-18");
    expect(result.brief.recovery.score).toBeNull();
    expect(result.brief.fitness.score).toBeNull();
    expect(result.trainingLoadHistory).toEqual([]);
    expect(result.timelineEvents).toEqual([]);
    expect(result.racePredictions.every((p) => p.result.value === null)).toBe(true);
  });

  it("computes recovery and fitness scores from the latest metrics snapshot", () => {
    const history = metricsSeries(Array.from({ length: 20 }, (_, i) => 40 + i));
    const result = assembleDailyBrief([], history, null, "2026-06-20");
    expect(result.brief.recovery.score).not.toBeNull();
    expect(result.brief.fitness.score).not.toBeNull();
  });

  it("derives race predictions from best efforts across activities, keeping the fastest per distance", () => {
    const activities = [
      makeActivity({ bestEfforts: { "5k": 1300 } }),
      makeActivity({ bestEfforts: { "5k": 1200 } }), // faster -- should win
    ];
    const result = assembleDailyBrief(activities, [], null, "2026-07-18");
    const fiveK = result.racePredictions.find((p) => p.label === "5K")!;
    expect(fiveK.result.value!.predictedTimeSec).toBe(1200);
    expect(fiveK.result.value!.method).toBe("actual_best_effort");
  });

  it("maps an upcoming goal into the brief's race countdown", () => {
    const result = assembleDailyBrief([], [], { id: "g1", label: "Chicago Marathon", kind: "marathon", targetDate: "2026-10-11" }, "2026-07-18");
    expect(result.brief.raceCountdown).toEqual({ raceName: "Chicago Marathon", daysUntil: 85 });
  });

  it("falls back to the goal's kind when it has no label", () => {
    const result = assembleDailyBrief([], [], { id: "g1", label: null, kind: "marathon", targetDate: "2026-10-11" }, "2026-07-18");
    expect(result.brief.raceCountdown!.raceName).toBe("marathon");
  });

  it("builds a timeline from recent activities, flagging personal records", () => {
    const activities = [
      makeActivity({ id: "a1", name: "Easy Run", startDate: "2026-07-10", bestEfforts: null }),
      makeActivity({ id: "a2", name: "Race Day", startDate: "2026-07-15", bestEfforts: { "5k": 1100 } }),
    ];
    const result = assembleDailyBrief(activities, [], null, "2026-07-18");
    expect(result.timelineEvents.find((e) => e.title === "Race Day")!.kind).toBe("personal_record");
    expect(result.timelineEvents.find((e) => e.title === "Easy Run")!.kind).toBe("activity");
  });

  it("produces at least one Intelligence Engine insight from a clearly trending CTL history", () => {
    const history = metricsSeries(Array.from({ length: 20 }, (_, i) => 40 + i * 2)); // strong upward trend
    const result = assembleDailyBrief([], history, null, "2026-06-20");
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.brief.keyInsights.length).toBeGreaterThan(0);
  });

  it("recommends recovery actions when recovery is low, and none when things look fine", () => {
    const lowRecoveryHistory: MetricsSnapshot[] = [{ date: "2026-07-18", ctl: 50, atl: 90, tsb: -40 }];
    const low = assembleDailyBrief([], lowRecoveryHistory, null, "2026-07-18");
    expect(low.recoveryRecommendations.length).toBeGreaterThan(0);

    const healthyHistory: MetricsSnapshot[] = [{ date: "2026-07-18", ctl: 50, atl: 50, tsb: 0 }];
    const healthy = assembleDailyBrief([], healthyHistory, null, "2026-07-18");
    // Sleep Priority always fires (no wearable data), but no load-driven recommendations should.
    expect(healthy.recoveryRecommendations.every((r) => r.recommendation === "Sleep Priority")).toBe(true);
  });

  it("computes a recovery time projection once ctl/atl are available", () => {
    const history: MetricsSnapshot[] = [{ date: "2026-07-18", ctl: 50, atl: 80, tsb: -30 }];
    const result = assembleDailyBrief([], history, null, "2026-07-18");
    expect(result.recoveryTime).not.toBeNull();
    expect(result.recoveryTime!.value!.daysUntilRecovered).toBeGreaterThan(0);
  });

  it("ignores unrecognized best-effort distance keys and keeps the fastest recognized one as the PR", () => {
    const activities = [
      makeActivity({ id: "a1", startDate: "2026-07-10", bestEfforts: { "5k": 1200, ultramarathon: 99999 } }), // "ultramarathon" isn't a known distance
      makeActivity({ id: "a2", startDate: "2026-07-12", bestEfforts: { "5k": 1300, ultramarathon: 100500 } }), // slower on every key -- not a new PR
    ];
    const result = assembleDailyBrief(activities, [], null, "2026-07-18");

    const fiveK = result.racePredictions.find((p) => p.label === "5K")!;
    expect(fiveK.result.value!.predictedTimeSec).toBe(1200);
    expect(result.timelineEvents.find((e) => e.date === "2026-07-10")!.kind).toBe("personal_record");
    expect(result.timelineEvents.find((e) => e.date === "2026-07-12")!.kind).toBe("activity");
  });

  it("flags only the faster effort as the PR when the same distance appears twice", () => {
    const activities = [
      makeActivity({ id: "a1", startDate: "2026-07-10", bestEfforts: { "5k": 1200 } }),
      makeActivity({ id: "a2", startDate: "2026-07-12", bestEfforts: { "5k": 1300 } }), // slower -- not the PR holder
    ];
    const result = assembleDailyBrief(activities, [], null, "2026-07-18");
    expect(result.timelineEvents.find((e) => e.date === "2026-07-10")!.kind).toBe("personal_record");
    expect(result.timelineEvents.find((e) => e.date === "2026-07-12")!.kind).toBe("activity");
  });

  it("leaves the timeline description blank when an activity has no distance", () => {
    const activities = [makeActivity({ id: "a1", distanceM: null })];
    const result = assembleDailyBrief(activities, [], null, "2026-07-18");
    expect(result.timelineEvents[0].description).toBe("");
  });

  it("raises a rapid_performance_drop alert on a high-confidence declining CTL trend", () => {
    const history = metricsSeries(Array.from({ length: 20 }, (_, i) => 80 - i * 2)); // strong, clean decline
    const result = assembleDailyBrief([], history, null, "2026-06-20");
    expect(result.brief.warnings.some((w) => w.kind === "rapid_performance_drop")).toBe(true);
  });

  it("detects a CTL plateau when the recent window has stopped moving", () => {
    const history = metricsSeries(Array.from({ length: 20 }, () => 60)); // perfectly flat
    const result = assembleDailyBrief([], history, null, "2026-06-20");
    expect(result.insights.some((i) => i.kind === "plateau")).toBe(true);
  });
});
