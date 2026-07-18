import { describe, expect, it } from "vitest";
import {
  analyzeShoePerformanceDifference,
  analyzeShoeWear,
  computeShoeUsageSummary,
  detectNewShoePersonalBests,
} from "../../analyzers/shoeAnalyzer";
import type { ActivityWithShoe } from "../../types/analyzerInputs";

const today = "2026-06-20";

function activity(overrides: Partial<ActivityWithShoe>): ActivityWithShoe {
  return {
    id: Math.random().toString(36).slice(2),
    startDate: "2026-06-01",
    distanceM: 10000,
    movingTimeS: 3000,
    averageWatts: null,
    bestEfforts: null,
    shoe: null,
    ...overrides,
  };
}

function shoeActivities(shoe: string, count: number, distanceKmEach: number, startDate = "2026-01-01"): ActivityWithShoe[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) =>
    activity({
      id: `${shoe}-${i}`,
      shoe,
      startDate: new Date(start + i * 86400000).toISOString().slice(0, 10),
      distanceM: distanceKmEach * 1000,
      movingTimeS: distanceKmEach * 300,
    }),
  );
}

describe("computeShoeUsageSummary", () => {
  it("ignores activities with no shoe", () => {
    const activities = [activity({ shoe: null })];
    expect(computeShoeUsageSummary(activities)).toEqual([]);
  });

  it("aggregates distance, pace and power per shoe", () => {
    const activities = [
      activity({ shoe: "Pegasus", distanceM: 10000, movingTimeS: 3000, averageWatts: 200 }),
      activity({ shoe: "Pegasus", distanceM: 5000, movingTimeS: 1500, averageWatts: 210 }),
    ];
    const summaries = computeShoeUsageSummary(activities);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].shoe).toBe("Pegasus");
    expect(summaries[0].activityCount).toBe(2);
    expect(summaries[0].totalDistanceKm).toBe(15);
    expect(summaries[0].averagePaceSecPerKm).toBeCloseTo(300, 5);
    expect(summaries[0].averagePowerWatts).toBe(205);
  });

  it("leaves pace/power null when no activity on the shoe has that data", () => {
    const activities = [activity({ shoe: "Pegasus", distanceM: null, movingTimeS: null, averageWatts: null })];
    const summaries = computeShoeUsageSummary(activities);
    expect(summaries[0].averagePaceSecPerKm).toBeNull();
    expect(summaries[0].averagePowerWatts).toBeNull();
  });
});

describe("analyzeShoeWear", () => {
  it("ignores shoes below the minimum activity count", () => {
    const activities = shoeActivities("Pegasus", 2, 400); // way past mileage, but too few activities
    expect(analyzeShoeWear(activities, today)).toEqual([]);
  });

  it("recommends replacement once total mileage reaches the threshold", () => {
    const activities = shoeActivities("Pegasus", 6, 130); // 6 * 130 = 780km >= 700km
    const insights = analyzeShoeWear(activities, today);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Shoe Replacement Recommended");
    expect(insights[0].severity).toBe("warning");
    expect(insights[0].category).toBe("equipment");
  });

  it("warns approaching replacement below the full threshold but above the approaching fraction", () => {
    const activities = shoeActivities("Pegasus", 6, 100); // 600km: 700*0.85=595 <= 600 < 700
    const insights = analyzeShoeWear(activities, today);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Shoe Approaching Replacement");
    expect(insights[0].severity).toBe("information");
  });

  it("reports nothing for a shoe well under the approaching threshold", () => {
    const activities = shoeActivities("Pegasus", 6, 10); // 60km
    expect(analyzeShoeWear(activities, today)).toEqual([]);
  });

  it("evaluates multiple shoes independently", () => {
    const activities = [...shoeActivities("Pegasus", 6, 130), ...shoeActivities("Vaporfly", 6, 10)];
    const insights = analyzeShoeWear(activities, today);
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toContain("Pegasus");
  });
});

describe("analyzeShoePerformanceDifference", () => {
  it("returns null with fewer than two eligible shoes", () => {
    const activities = shoeActivities("Pegasus", 6, 10);
    expect(analyzeShoePerformanceDifference(activities, today)).toBeNull();
  });

  it("returns null when the two shoes' pace difference is below the threshold", () => {
    const activities = [...shoeActivities("Pegasus", 6, 10), ...shoeActivities("Vaporfly", 5, 10)];
    expect(analyzeShoePerformanceDifference(activities, today)).toBeNull();
  });

  it("reports a performance difference when the two most-used shoes' average pace diverges meaningfully", () => {
    // Pegasus: 300s/km pace (10km/3000s). Vaporfly: much faster pace.
    const pegasus = shoeActivities("Pegasus", 6, 10);
    const vaporfly = Array.from({ length: 5 }, (_, i) =>
      activity({ id: `vf-${i}`, shoe: "Vaporfly", startDate: `2026-02-0${i + 1}`, distanceM: 10000, movingTimeS: 2400 }),
    );
    const insight = analyzeShoePerformanceDifference([...pegasus, ...vaporfly], today);
    expect(insight?.title).toBe("Performance Difference Between Shoes");
    expect(insight?.category).toBe("equipment");
  });
});

describe("detectNewShoePersonalBests", () => {
  it("returns no insights when no PR falls within a shoe's early activities", () => {
    const activities = shoeActivities("Pegasus", 6, 10);
    expect(detectNewShoePersonalBests(activities, today)).toEqual([]);
  });

  it("reports a new-shoe PR when a best effort is set within the shoe's first activities, on the evaluated date", () => {
    const activities = [
      activity({ id: "a1", shoe: "Pegasus", startDate: "2026-06-01", bestEfforts: { "5k": 1300 } }),
      activity({ id: "a2", shoe: "Pegasus", startDate: "2026-06-02", bestEfforts: { "5k": 1200 } }),
    ];
    const insights = detectNewShoePersonalBests(activities, "2026-06-02");
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("New Shoe Personal Best");
    expect(insights[0].severity).toBe("positive");
  });

  it("does not report a new-shoe PR once the shoe is past the new-shoe activity count threshold", () => {
    const early = [
      activity({ id: "a1", shoe: "Pegasus", startDate: "2026-06-01", bestEfforts: { "5k": 1300 } }),
      activity({ id: "a2", shoe: "Pegasus", startDate: "2026-06-02" }),
      activity({ id: "a3", shoe: "Pegasus", startDate: "2026-06-03" }),
      activity({ id: "a4", shoe: "Pegasus", startDate: "2026-06-04" }),
    ];
    const lateRecord = activity({ id: "a5", shoe: "Pegasus", startDate: "2026-06-05", bestEfforts: { "5k": 1100 } });
    const insights = detectNewShoePersonalBests([...early, lateRecord], "2026-06-05");
    expect(insights).toEqual([]);
  });

  it("does not report a PR for an activity with no shoe recorded", () => {
    const activities = [activity({ id: "a1", shoe: null, startDate: "2026-06-01", bestEfforts: { "5k": 1200 } })];
    expect(detectNewShoePersonalBests(activities, "2026-06-01")).toEqual([]);
  });
});
