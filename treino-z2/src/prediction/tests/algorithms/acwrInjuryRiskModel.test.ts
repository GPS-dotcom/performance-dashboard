import { describe, expect, it } from "vitest";
import { acwrInjuryRiskModel, predictAcuteLoadRisk } from "../../algorithms/acwrInjuryRiskModel";

describe("predictAcuteLoadRisk", () => {
  it("returns an unavailable output when ctl is non-positive", () => {
    const output = predictAcuteLoadRisk({ ctl: 0, atl: 50 });
    expect(output.value).toBeNull();
    expect(output.missingInputs).toEqual(["ctl must be positive to compute ACWR"]);
  });

  it("classifies an ACWR within the sweet spot as low risk", () => {
    const output = predictAcuteLoadRisk({ ctl: 50, atl: 50 }); // acwr = 1.0
    expect(output.value!.riskLevel).toBe("low");
    expect(output.value!.riskScore).toBe(20);
    expect(output.value!.acwr).toBeCloseTo(1.0, 10);
  });

  it("classifies an ACWR above the danger threshold as high risk, with a score that grows with the overshoot", () => {
    const moderate = predictAcuteLoadRisk({ ctl: 50, atl: 80 }); // acwr = 1.6
    const severe = predictAcuteLoadRisk({ ctl: 50, atl: 120 }); // acwr = 2.4
    expect(moderate.value!.riskLevel).toBe("high");
    expect(severe.value!.riskLevel).toBe("high");
    expect(severe.value!.riskScore).toBeGreaterThan(moderate.value!.riskScore);
  });

  it("caps riskScore at 100", () => {
    const output = predictAcuteLoadRisk({ ctl: 10, atl: 1000 });
    expect(output.value!.riskScore).toBe(100);
  });

  it("classifies an ACWR below the sweet spot (but not near zero) as moderate risk", () => {
    const output = predictAcuteLoadRisk({ ctl: 50, atl: 30 }); // acwr = 0.6
    expect(output.value!.riskLevel).toBe("moderate");
    expect(output.value!.riskScore).toBe(45);
  });

  it("always flags the lack of HRV/sleep/wellness signals as a missing input", () => {
    const output = predictAcuteLoadRisk({ ctl: 50, atl: 50 });
    expect(output.missingInputs).toEqual(["additional signals (HRV, sleep, prior injury history, subjective wellness) would improve this estimate"]);
  });

  it("returns a bound clamped to [0, 100]", () => {
    const output = predictAcuteLoadRisk({ ctl: 10, atl: 1000 });
    expect(output.lowerBound!).toBeGreaterThanOrEqual(0);
    expect(output.upperBound!).toBeLessThanOrEqual(100);
  });
});

describe("acwrInjuryRiskModel", () => {
  it("exposes a stable modelId and delegates to predictAcuteLoadRisk", () => {
    expect(acwrInjuryRiskModel.modelId).toBe("acwr-injury-risk");
    expect(acwrInjuryRiskModel.predict({ ctl: 50, atl: 50 }).value!.riskLevel).toBe("low");
  });
});
