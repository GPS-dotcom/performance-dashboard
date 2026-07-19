import { describe, expect, it } from "vitest";
import { assemblePredictionsView } from "../../hooks/assemblePredictionsView";
import type { Activity, MetricsSnapshot } from "../../../types";

const today = "2026-07-19";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Race",
    startDate: "2026-07-10T08:00:00Z",
    distanceM: 5000,
    movingTimeS: 1200,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: null,
    bestEfforts: { "5k": 1200 },
    zoneMinutes: null,
    ...overrides,
  };
}

describe("assemblePredictionsView", () => {
  it("always returns all four race distances, even with no best efforts", () => {
    const result = assemblePredictionsView([], [], today);
    expect(result.racePredictions.map((p) => p.label)).toEqual(["5K", "10K", "Half Marathon", "Marathon"]);
    expect(result.racePredictions.every((p) => p.result.value == null)).toBe(true);
  });

  it("produces a real 5K prediction from a matching best effort", () => {
    const result = assemblePredictionsView([makeActivity()], [], today);
    const fiveK = result.racePredictions.find((p) => p.label === "5K");
    expect(fiveK?.result.value?.predictedTimeSec).toBe(1200);
  });

  it("computes fitness evolution only with at least 2 CTL data points", () => {
    expect(assemblePredictionsView([], [{ date: "2026-07-18", ctl: 50, atl: 40, tsb: 10 }], today).fitnessEvolution).toBeNull();

    const history: MetricsSnapshot[] = [
      { date: "2026-07-10", ctl: 40, atl: 30, tsb: 10 },
      { date: "2026-07-17", ctl: 45, atl: 35, tsb: 10 },
    ];
    const result = assemblePredictionsView([], history, today);
    expect(result.fitnessEvolution).not.toBeNull();
  });

  it("computes recoveryTime and injuryRisk from the latest snapshot only", () => {
    const history: MetricsSnapshot[] = [{ date: "2026-07-18", ctl: 50, atl: 60, tsb: -10 }];
    const result = assemblePredictionsView([], history, today);
    expect(result.recoveryTime).not.toBeNull();
    expect(result.injuryRisk).not.toBeNull();
  });

  it("returns null recoveryTime/injuryRisk when there's no metrics history", () => {
    const result = assemblePredictionsView([], [], today);
    expect(result.recoveryTime).toBeNull();
    expect(result.injuryRisk).toBeNull();
  });
});
