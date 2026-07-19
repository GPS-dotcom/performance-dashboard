import { describe, expect, it } from "vitest";
import { generateRaceStrategyRecommendations } from "../../recommendations/raceStrategyRecommendations";
import type { RaceStrategyInput } from "../../recommendations/raceStrategyRecommendations";

const today = "2026-07-18";

function input(overrides: Partial<RaceStrategyInput> = {}): RaceStrategyInput {
  return { raceDistanceKm: 10, predictedTimeSec: 2400, supportingPredictions: ["prediction:race_tenK:2026-07-18"], lt2HeartRate: null, lt2PowerWatts: null, ...overrides };
}

describe("generateRaceStrategyRecommendations", () => {
  it("always includes a Race Pace Target derived from predictedTimeSec / distance", () => {
    const recs = generateRaceStrategyRecommendations(input(), today);
    const paceTarget = recs.find((r) => r.title === "Race Pace Target")!;
    // 2400s / 10km = 240s/km = 4:00/km
    expect(paceTarget.description).toContain("4:00/km");
    expect(paceTarget.supportingPredictions).toEqual(["prediction:race_tenK:2026-07-18"]);
  });

  it("includes a heart rate target only when lt2HeartRate is provided", () => {
    const withHr = generateRaceStrategyRecommendations(input({ lt2HeartRate: 170 }), today);
    expect(withHr.some((r) => r.title === "Race Heart Rate Target")).toBe(true);

    const withoutHr = generateRaceStrategyRecommendations(input(), today);
    expect(withoutHr.some((r) => r.title === "Race Heart Rate Target")).toBe(false);
  });

  it("includes a power target only when lt2PowerWatts is provided", () => {
    const withPower = generateRaceStrategyRecommendations(input({ lt2PowerWatts: 250 }), today);
    expect(withPower.some((r) => r.title === "Race Power Target")).toBe(true);
  });

  it("always includes fueling and warmup/recovery guidance", () => {
    const recs = generateRaceStrategyRecommendations(input(), today);
    expect(recs.some((r) => r.title === "Race Fueling Plan")).toBe(true);
    expect(recs.some((r) => r.title === "Warmup & Post-Race Recovery")).toBe(true);
  });

  it("picks the guidance tier closest in log-distance to the race distance", () => {
    const marathon = generateRaceStrategyRecommendations(input({ raceDistanceKm: 42.195, predictedTimeSec: 12000 }), today);
    const fiveK = generateRaceStrategyRecommendations(input({ raceDistanceKm: 5, predictedTimeSec: 1000 }), today);
    // Marathon guidance mentions multi-week recovery; 5K guidance mentions 1-2 days.
    expect(marathon.find((r) => r.title === "Warmup & Post-Race Recovery")!.description).toContain("2-4 weeks");
    expect(fiveK.find((r) => r.title === "Warmup & Post-Race Recovery")!.description).toContain("1-2 days");
  });

  it("every recommendation is type 'race_strategy'", () => {
    const recs = generateRaceStrategyRecommendations(input({ lt2HeartRate: 170, lt2PowerWatts: 250 }), today);
    for (const r of recs) expect(r.type).toBe("race_strategy");
  });

  it("gives distinct ids across different distances via idSuffix", () => {
    const tenK = generateRaceStrategyRecommendations(input({ raceDistanceKm: 10 }), today);
    const fiveK = generateRaceStrategyRecommendations(input({ raceDistanceKm: 5, predictedTimeSec: 1000 }), today);
    expect(tenK[0].id).not.toBe(fiveK[0].id);
  });
});
