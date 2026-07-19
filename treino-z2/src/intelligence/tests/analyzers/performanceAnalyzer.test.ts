import { describe, expect, it } from "vitest";
import {
  analyzeDistanceEvolution,
  analyzePacePerformanceEvolution,
  analyzePowerPerformanceEvolution,
  detectPersonalBests,
} from "../../analyzers/performanceAnalyzer";
import type { Activity } from "../../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Run",
    startDate: "2026-06-01",
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

describe("detectPersonalBests", () => {
  it("returns no insights when no activity has bestEfforts", () => {
    const activities = [makeActivity({ startDate: "2026-06-01" })];
    expect(detectPersonalBests(activities, "2026-06-01")).toEqual([]);
  });

  it("reports a PR only for the activity dated `date`, even if an earlier activity also set one", () => {
    const activities = [
      makeActivity({ id: "a1", startDate: "2026-06-01", bestEfforts: { "5k": 1300 } }),
      makeActivity({ id: "a2", startDate: "2026-06-05", bestEfforts: { "5k": 1200 } }),
    ];
    const insights = detectPersonalBests(activities, "2026-06-05");
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("New Personal Best");
    expect(insights[0].evidence[0]).toContain("previous best at 5k: 1300s");
  });

  it("does not report a PR for an activity that is not actually the fastest at that distance", () => {
    const activities = [
      makeActivity({ id: "a1", startDate: "2026-06-01", bestEfforts: { "5k": 1200 } }),
      makeActivity({ id: "a2", startDate: "2026-06-05", bestEfforts: { "5k": 1300 } }), // slower
    ];
    expect(detectPersonalBests(activities, "2026-06-05")).toEqual([]);
  });

  it("reports separate PR insights (with distinct ids) for multiple distances set on the same day", () => {
    const activities = [makeActivity({ id: "a1", startDate: "2026-06-05", bestEfforts: { "5k": 1200, "10k": 2500 } })];
    const insights = detectPersonalBests(activities, "2026-06-05");
    expect(insights).toHaveLength(2);
    expect(new Set(insights.map((i) => i.id)).size).toBe(2);
  });

  it("treats the very first recorded effort at a distance as a PR with no prior-best evidence", () => {
    const activities = [makeActivity({ id: "a1", startDate: "2026-06-05", bestEfforts: { "5k": 1300 } })];
    const insights = detectPersonalBests(activities, "2026-06-05");
    expect(insights[0].evidence[0]).toContain("first recorded effort at 5k");
  });
});

describe("analyzeDistanceEvolution", () => {
  function activitiesWithEfforts(times: number[]): Activity[] {
    return times.map((timeSec, i) =>
      makeActivity({ id: `a${i}`, startDate: `2026-06-0${i + 1}`, bestEfforts: { "5k": timeSec } }),
    );
  }

  it("returns null with fewer efforts than the minimum required", () => {
    expect(analyzeDistanceEvolution(activitiesWithEfforts([1300, 1290]), "5k", "2026-06-10")).toBeNull();
  });

  it("reports an improving trend when best-effort time at a distance drops over time (lower_is_better)", () => {
    const insight = analyzeDistanceEvolution(activitiesWithEfforts([1300, 1280, 1260, 1240, 1220]), "5k", "2026-06-10");
    expect(insight?.title).toBe("5k Best Effort Improving");
    expect(insight?.category).toBe("performance");
  });

  it("ignores activities that have no best effort at the requested distance", () => {
    const activities = [
      makeActivity({ id: "a1", startDate: "2026-06-01", bestEfforts: { "10k": 2500 } }),
      ...activitiesWithEfforts([1300, 1280, 1260, 1240, 1220]),
    ];
    const insight = analyzeDistanceEvolution(activities, "5k", "2026-06-10");
    expect(insight).not.toBeNull();
  });
});

describe("analyzePowerPerformanceEvolution", () => {
  function activitiesWithPower(watts: number[]): Activity[] {
    return watts.map((w, i) => makeActivity({ id: `a${i}`, startDate: `2026-06-0${i + 1}`, averageWatts: w }));
  }

  it("returns null with fewer sessions than the minimum", () => {
    expect(analyzePowerPerformanceEvolution(activitiesWithPower([200, 210]), "2026-06-10")).toBeNull();
  });

  it("prefers weightedAverageWatts over averageWatts when both are present", () => {
    const activities = [1, 2, 3, 4, 5].map((i) =>
      makeActivity({ id: `a${i}`, startDate: `2026-06-0${i}`, averageWatts: 100, weightedAverageWatts: 100 + i * 20 }),
    );
    const insight = analyzePowerPerformanceEvolution(activities, "2026-06-10");
    expect(insight?.title).toBe("Session Power Improving");
  });

  it("reports an improving trend for rising average power (higher_is_better)", () => {
    const insight = analyzePowerPerformanceEvolution(activitiesWithPower([200, 210, 220, 230, 240]), "2026-06-10");
    expect(insight?.title).toBe("Session Power Improving");
    expect(insight?.category).toBe("performance");
  });
});

describe("analyzePacePerformanceEvolution", () => {
  function activitiesWithPace(distanceM: number, movingTimeS: (i: number) => number, count: number): Activity[] {
    return Array.from({ length: count }, (_, i) =>
      makeActivity({ id: `a${i}`, startDate: `2026-06-0${i + 1}`, distanceM, movingTimeS: movingTimeS(i) }),
    );
  }

  it("returns null with fewer sessions than the minimum", () => {
    expect(analyzePacePerformanceEvolution(activitiesWithPace(5000, () => 1500, 2), "2026-06-10")).toBeNull();
  });

  it("skips activities without both distance and moving time", () => {
    const activities = [
      makeActivity({ id: "a0", startDate: "2026-06-01", distanceM: null, movingTimeS: 1500 }),
      ...activitiesWithPace(5000, (i) => 1500 - i * 10, 5),
    ];
    const insight = analyzePacePerformanceEvolution(activities, "2026-06-10");
    expect(insight).not.toBeNull();
  });

  it("reports an improving trend when pace (seconds/km) drops over time (lower_is_better)", () => {
    const insight = analyzePacePerformanceEvolution(activitiesWithPace(5000, (i) => 1500 - i * 15, 5), "2026-06-10");
    expect(insight?.title).toBe("Session Pace Improving");
  });
});
