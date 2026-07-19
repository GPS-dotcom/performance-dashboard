import { describe, expect, it } from "vitest";
import { predictCurrentLoadImpact, predictRecoveryTime } from "../../predictors/recoveryPredictor";

const today = "2026-07-18";

describe("predictRecoveryTime", () => {
  it("reports category recovery, predictionType recovery_time and supportingMetrics [ctl, atl]", () => {
    const prediction = predictRecoveryTime(50, 100, today);
    expect(prediction.category).toBe("recovery");
    expect(prediction.predictionType).toBe("recovery_time");
    expect(prediction.supportingMetrics).toEqual(["ctl", "atl"]);
    expect(prediction.value!.daysUntilRecovered).toBe(5);
  });
});

describe("predictCurrentLoadImpact", () => {
  it("reports predictionType current_load_impact and supportingMetrics [ctl, atl]", () => {
    const prediction = predictCurrentLoadImpact(50, 100, 30, today);
    expect(prediction.predictionType).toBe("current_load_impact");
    expect(prediction.category).toBe("recovery");
    expect(prediction.value!.additionalDaysUntilRecovered).toBe(4);
  });
});
