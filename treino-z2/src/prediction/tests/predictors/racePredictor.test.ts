import { describe, expect, it } from "vitest";
import {
  RACE_DISTANCES_KM,
  predictRace10K,
  predictRace15K,
  predictRace21K,
  predictRace30K,
  predictRace5K,
  predictRaceMarathon,
  predictRaceTime,
} from "../../predictors/racePredictor";
import type { BestEffort } from "../../types/seriesTypes";

const bestEfforts: BestEffort[] = [{ distanceKm: 10, timeSec: 2400 }];
const today = "2026-07-18";

describe("RACE_DISTANCES_KM", () => {
  it("defines all 6 requested race distances", () => {
    expect(RACE_DISTANCES_KM).toEqual({ fiveK: 5, tenK: 10, fifteenK: 15, halfMarathon: 21.0975, thirtyK: 30, marathon: 42.195 });
  });
});

describe("predictRaceTime", () => {
  it("produces a Prediction with the right category/predictionType/id for each distance key", () => {
    const prediction = predictRaceTime("fiveK", bestEfforts, today);
    expect(prediction.category).toBe("race");
    expect(prediction.predictionType).toBe("race_time_5k");
    expect(prediction.id).toBe(`prediction:race_fiveK:${today}`);
    expect(prediction.supportingMetrics).toEqual(["best_effort"]);
    expect(prediction.generatedAt).toBe(today);
  });

  it("carries the underlying Riegel model's value/confidence/bounds through unchanged", () => {
    const prediction = predictRaceTime("marathon", bestEfforts, today);
    expect(prediction.value).not.toBeNull();
    expect(prediction.value!.method).toBe("riegel_extrapolation");
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.lowerBound).not.toBeNull();
    expect(prediction.upperBound).not.toBeNull();
  });
});

describe("named race distance wrappers", () => {
  it.each([
    ["predictRace5K", predictRace5K, "race_time_5k"],
    ["predictRace10K", predictRace10K, "race_time_10k"],
    ["predictRace15K", predictRace15K, "race_time_15k"],
    ["predictRace21K", predictRace21K, "race_time_21k"],
    ["predictRace30K", predictRace30K, "race_time_30k"],
    ["predictRaceMarathon", predictRaceMarathon, "race_time_marathon"],
  ] as const)("%s reports predictionType %s", (_name, fn, expectedType) => {
    const prediction = fn(bestEfforts, today);
    expect(prediction.predictionType).toBe(expectedType);
    expect(prediction.category).toBe("race");
  });
});
