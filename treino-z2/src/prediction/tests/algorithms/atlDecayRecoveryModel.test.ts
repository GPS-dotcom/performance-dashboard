import { describe, expect, it } from "vitest";
import {
  atlDecayRecoveryModel,
  currentLoadImpactModel,
  predictCurrentLoadImpact,
  predictRecoveryTimeAtlDecay,
} from "../../algorithms/atlDecayRecoveryModel";

describe("predictRecoveryTimeAtlDecay", () => {
  it("returns an unavailable output when ctl or atl is non-positive", () => {
    expect(predictRecoveryTimeAtlDecay({ ctl: 0, atl: 50 }).value).toBeNull();
    expect(predictRecoveryTimeAtlDecay({ ctl: 50, atl: 0 }).value).toBeNull();
  });

  it("returns 0 days when atl is already at or below ctl", () => {
    const output = predictRecoveryTimeAtlDecay({ ctl: 50, atl: 40 });
    expect(output.value).toEqual({ daysUntilRecovered: 0, assumedDailyTss: 0 });
    expect(output.confidence).toBe(0.8);
    expect(output.lowerBound).toBe(0);
    expect(output.upperBound).toBe(0);
  });

  it("solves the ATL decay recurrence analytically for a known ctl/atl pair", () => {
    // ratio = ctl/atl = 50/100 = 0.5; n = ceil(ln(0.5)/ln(6/7)) = 5
    const output = predictRecoveryTimeAtlDecay({ ctl: 50, atl: 100 });
    expect(output.value!.daysUntilRecovered).toBe(5);
    expect(output.value!.assumedDailyTss).toBe(0);
    expect(output.confidence).toBe(0.65);
  });

  it("lowers confidence for a longer recovery horizon (> 14 days)", () => {
    // ratio = 50/500 = 0.1; n = ceil(ln(0.1)/ln(6/7)) ~= 15
    const output = predictRecoveryTimeAtlDecay({ ctl: 50, atl: 500 });
    expect(output.value!.daysUntilRecovered).toBeGreaterThan(14);
    expect(output.confidence).toBe(0.4);
  });

  it("always returns a non-negative lowerBound", () => {
    const output = predictRecoveryTimeAtlDecay({ ctl: 50, atl: 100 });
    expect(output.lowerBound!).toBeGreaterThanOrEqual(0);
  });
});

describe("atlDecayRecoveryModel", () => {
  it("exposes a stable modelId and delegates to predictRecoveryTimeAtlDecay", () => {
    expect(atlDecayRecoveryModel.modelId).toBe("atl-decay-analytical-solve");
    expect(atlDecayRecoveryModel.predict({ ctl: 50, atl: 100 }).value!.daysUntilRecovered).toBe(5);
  });
});

describe("predictCurrentLoadImpact", () => {
  it("returns an unavailable output when ctl/atl are non-positive or currentDailyTss is negative", () => {
    expect(predictCurrentLoadImpact({ ctl: 0, atl: 100, currentDailyTss: 30 }).value).toBeNull();
    expect(predictCurrentLoadImpact({ ctl: 50, atl: 100, currentDailyTss: -1 }).value).toBeNull();
  });

  it("computes additional recovery days relative to complete rest, for a load below CTL", () => {
    // rest: 5 days (see predictRecoveryTimeAtlDecay test above)
    // currentDailyTss=30: ratio = (50-30)/(100-30) = 2/7; n = ceil(ln(2/7)/ln(6/7)) = 9
    const output = predictCurrentLoadImpact({ ctl: 50, atl: 100, currentDailyTss: 30 });
    expect(output.value!.daysUntilRecoveredAtRest).toBe(5);
    expect(output.value!.daysUntilRecoveredAtCurrentLoad).toBe(9);
    expect(output.value!.additionalDaysUntilRecovered).toBe(4);
    expect(output.value!.recoversUnderThisLoad).toBe(true);
    expect(output.missingInputs).toEqual([]);
  });

  it("reports no finite recovery horizon when the current load is at or above CTL", () => {
    const output = predictCurrentLoadImpact({ ctl: 50, atl: 100, currentDailyTss: 60 });
    expect(output.value!.daysUntilRecoveredAtCurrentLoad).toBeNull();
    expect(output.value!.additionalDaysUntilRecovered).toBeNull();
    expect(output.value!.recoversUnderThisLoad).toBe(false);
    expect(output.missingInputs.length).toBeGreaterThan(0);
  });

  it("always returns assumedDailyTss equal to the input currentDailyTss", () => {
    const output = predictCurrentLoadImpact({ ctl: 50, atl: 100, currentDailyTss: 35 });
    expect(output.value!.assumedDailyTss).toBe(35);
  });
});

describe("currentLoadImpactModel", () => {
  it("exposes a stable modelId and delegates to predictCurrentLoadImpact", () => {
    expect(currentLoadImpactModel.modelId).toBe("atl-decay-load-comparison");
    expect(currentLoadImpactModel.predict({ ctl: 50, atl: 100, currentDailyTss: 30 }).value!.additionalDaysUntilRecovered).toBe(4);
  });
});
