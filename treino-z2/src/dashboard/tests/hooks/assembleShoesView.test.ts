import { describe, expect, it } from "vitest";
import { assembleShoesView } from "../../hooks/assembleShoesView";
import type { Activity } from "../../../types";

const today = "2026-07-19";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Run",
    startDate: "2026-07-10T08:00:00Z",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: null,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

describe("assembleShoesView", () => {
  it("always maps activities to shoe: null since no gear column exists yet, so results are always empty", () => {
    const result = assembleShoesView([makeActivity(), makeActivity({ id: "act-2" })], today);
    expect(result.usageSummaries).toEqual([]);
    expect(result.wearInsights).toEqual([]);
    expect(result.performanceDifference).toBeNull();
    expect(result.newPersonalBests).toEqual([]);
    expect(result.hasGearData).toBe(false);
  });

  it("returns hasGearData: false even with an empty activity list", () => {
    expect(assembleShoesView([], today).hasGearData).toBe(false);
  });
});
