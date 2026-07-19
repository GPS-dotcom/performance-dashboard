import { describe, expect, it } from "vitest";
import { hardTrainingReadinessModel, predictHardTrainingReadiness, predictRaceReadiness, raceReadinessModel } from "../../algorithms/readinessModel";

describe("predictRaceReadiness", () => {
  it("computes a weighted composite (45% TSB, 40% Recovery, 15% ACWR) when all inputs are present", () => {
    // tsbComponent(0) = (0+30)/55*100 = 54.5454...; acwrComponent(1.05) = 100 (sweet spot)
    const output = predictRaceReadiness({ recoveryScore: 80, tsb: 0, acwr: 1.05 });
    const expected = 80 * 0.4 + (30 / 55) * 100 * 0.45 + 100 * 0.15;
    expect(output.value!.readinessScore).toBeCloseTo(expected, 5);
    expect(output.value!.readinessLevel).toBe("high");
    expect(output.missingInputs).toEqual([]);
  });

  it("renormalizes weights and reports a missing input when one signal is unavailable", () => {
    const output = predictRaceReadiness({ recoveryScore: 80, tsb: null, acwr: 1.05 });
    const expected = (80 * 0.4 + 100 * 0.15) / (0.4 + 0.15);
    expect(output.value!.readinessScore).toBeCloseTo(expected, 5);
    expect(output.missingInputs).toEqual(["tsb"]);
  });

  it("returns a score of 0 and lists every input as missing when nothing is available", () => {
    const output = predictRaceReadiness({ recoveryScore: null, tsb: null, acwr: null });
    expect(output.value!.readinessScore).toBe(0);
    expect(output.value!.readinessLevel).toBe("low");
    expect(output.missingInputs).toEqual(["recovery score", "tsb", "acwr"]);
  });

  it("classifies scores into low/moderate/high at the documented boundaries", () => {
    expect(predictRaceReadiness({ recoveryScore: 90, tsb: 25, acwr: 1.05 }).value!.readinessLevel).toBe("high");
    expect(predictRaceReadiness({ recoveryScore: 50, tsb: -30, acwr: 1.05 }).value!.readinessLevel).toBe("low");
  });

  it("lowers confidence as more inputs go missing", () => {
    const full = predictRaceReadiness({ recoveryScore: 80, tsb: 0, acwr: 1.05 });
    const partial = predictRaceReadiness({ recoveryScore: 80, tsb: null, acwr: null });
    expect(partial.confidence).toBeLessThan(full.confidence);
  });
});

describe("predictHardTrainingReadiness", () => {
  it("computes a weighted composite (50% Recovery, 35% ACWR, 15% TSB) when all inputs are present", () => {
    const output = predictHardTrainingReadiness({ recoveryScore: 80, tsb: 0, acwr: 1.05 });
    const expected = 80 * 0.5 + (30 / 55) * 100 * 0.15 + 100 * 0.35;
    expect(output.value!.readinessScore).toBeCloseTo(expected, 5);
  });

  it("weights ACWR more heavily than the race-readiness variant does", () => {
    const badAcwr = { recoveryScore: 80, tsb: 0, acwr: 3 }; // far outside the sweet spot -> acwrComponent = 0
    const race = predictRaceReadiness(badAcwr);
    const hardTraining = predictHardTrainingReadiness(badAcwr);
    // Hard-training readiness weights ACWR (35%) more than race readiness does (15%), so a
    // bad ACWR should pull its score down further, relative to the same inputs.
    expect(hardTraining.value!.readinessScore).toBeLessThan(race.value!.readinessScore);
  });
});

describe("raceReadinessModel / hardTrainingReadinessModel", () => {
  it("expose stable, distinct modelIds and delegate to their respective predict functions", () => {
    expect(raceReadinessModel.modelId).toBe("composite-race-readiness");
    expect(hardTrainingReadinessModel.modelId).toBe("composite-hard-training-readiness");
    expect(raceReadinessModel.predict({ recoveryScore: 80, tsb: 0, acwr: 1.05 }).value).not.toBeNull();
    expect(hardTrainingReadinessModel.predict({ recoveryScore: 80, tsb: 0, acwr: 1.05 }).value).not.toBeNull();
  });
});
