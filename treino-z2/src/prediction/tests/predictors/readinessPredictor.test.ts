import { describe, expect, it } from "vitest";
import { predictHardTrainingReadiness, predictRaceReadiness } from "../../predictors/readinessPredictor";

const today = "2026-07-18";
const input = { recoveryScore: 80, tsb: 0, acwr: 1.05 };

describe("predictRaceReadiness", () => {
  it("reports category readiness, predictionType readiness_race and the 3 supporting metrics", () => {
    const prediction = predictRaceReadiness(input, today);
    expect(prediction.category).toBe("readiness");
    expect(prediction.predictionType).toBe("readiness_race");
    expect(prediction.supportingMetrics).toEqual(["recovery_score", "tsb", "acwr"]);
    expect(prediction.value!.readinessLevel).toBe("high");
  });
});

describe("predictHardTrainingReadiness", () => {
  it("reports predictionType readiness_hard_training", () => {
    const prediction = predictHardTrainingReadiness(input, today);
    expect(prediction.predictionType).toBe("readiness_hard_training");
    expect(prediction.category).toBe("readiness");
  });
});
