import { describe, expect, it } from "vitest";
import { generateRaceStrategy } from "../raceStrategy";
import { RACE_DISTANCES_KM } from "../../prediction";

describe("generateRaceStrategy", () => {
  it("derives target pace directly from the given prediction, without predicting a new time", () => {
    const strategy = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.marathon,
      predictedTimeSec: 12600,
      lt2HeartRate: null,
      lt2PowerWatts: null,
    });
    expect(strategy.targetPaceSecPerKm).toBeCloseTo(298.6136, 3);
  });

  it("scales LT2 heart rate and power by the marathon-specific effort percentage", () => {
    const strategy = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.marathon,
      predictedTimeSec: 12600,
      lt2HeartRate: 170,
      lt2PowerWatts: 250,
    });
    expect(strategy.targetHeartRateRange).toEqual({ min: 136, max: 150 });
    expect(strategy.targetPowerRange).toEqual({ min: 200, max: 220 });
  });

  it("uses a higher percentage of LT2 for a 5K than for a marathon", () => {
    const marathon = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.marathon,
      predictedTimeSec: 12600,
      lt2HeartRate: 170,
      lt2PowerWatts: null,
    });
    const fiveK = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.fiveK,
      predictedTimeSec: 1200,
      lt2HeartRate: 170,
      lt2PowerWatts: null,
    });
    expect(fiveK.targetHeartRateRange!.min).toBeGreaterThan(marathon.targetHeartRateRange!.min);
  });

  it("returns null ranges when LT2 heart rate/power aren't available", () => {
    const strategy = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.tenK,
      predictedTimeSec: 2400,
      lt2HeartRate: null,
      lt2PowerWatts: null,
    });
    expect(strategy.targetHeartRateRange).toBeNull();
    expect(strategy.targetPowerRange).toBeNull();
  });

  it("gives distance-appropriate nutrition guidance (fueling for marathon, none for 5K)", () => {
    const marathon = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.marathon,
      predictedTimeSec: 12600,
      lt2HeartRate: null,
      lt2PowerWatts: null,
    });
    const fiveK = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.fiveK,
      predictedTimeSec: 1200,
      lt2HeartRate: null,
      lt2PowerWatts: null,
    });
    expect(marathon.nutritionStrategy).toMatch(/carbohydrate per hour/);
    expect(fiveK.nutritionStrategy).toMatch(/No fueling needed/);
  });

  it("picks the closest guidance tier for a non-standard distance", () => {
    // |ln(15/21.0975)| = 0.341 vs |ln(15/10)| = 0.405 -- 15K is closer to the half marathon.
    const strategy = generateRaceStrategy({
      raceDistanceKm: 15,
      predictedTimeSec: 3600,
      lt2HeartRate: 170,
      lt2PowerWatts: null,
    });
    const half = generateRaceStrategy({
      raceDistanceKm: RACE_DISTANCES_KM.halfMarathon,
      predictedTimeSec: 5400,
      lt2HeartRate: 170,
      lt2PowerWatts: null,
    });
    expect(strategy.targetHeartRateRange).toEqual(half.targetHeartRateRange);
  });
});
