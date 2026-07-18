import { describe, expect, it } from "vitest";
import { predictInjuryRisk } from "../injuryRisk";

describe("predictInjuryRisk", () => {
  it("scores low risk within the ACWR sweet spot (0.8-1.3)", () => {
    const result = predictInjuryRisk(50, 50); // acwr = 1.0
    expect(result.value).toEqual({ acwr: 1.0, riskLevel: "low", riskScore: 20 });
  });

  it("scores moderate risk below the sweet spot (undertraining relative to chronic load)", () => {
    const result = predictInjuryRisk(50, 25); // acwr = 0.5
    expect(result.value!.riskLevel).toBe("moderate");
    expect(result.value!.riskScore).toBe(45);
  });

  it("scores moderate risk between the sweet spot and the danger threshold", () => {
    const result = predictInjuryRisk(50, 70); // acwr = 1.4
    expect(result.value!.riskLevel).toBe("moderate");
  });

  it("scores high risk above the 1.5 danger threshold, scaling with how far past it", () => {
    const result = predictInjuryRisk(50, 100); // acwr = 2.0
    expect(result.value!.riskLevel).toBe("high");
    expect(result.value!.riskScore).toBeCloseTo(90, 6); // 70 + (2.0-1.5)*40
  });

  it("caps the risk score at 100 for extreme ACWR", () => {
    const result = predictInjuryRisk(10, 200); // acwr = 20
    expect(result.value!.riskScore).toBe(100);
  });

  it("is unavailable when ctl is zero or negative", () => {
    expect(predictInjuryRisk(0, 50).value).toBeNull();
    expect(predictInjuryRisk(-5, 50).value).toBeNull();
  });

  it("always flags the missing wearable-derived signals", () => {
    const result = predictInjuryRisk(50, 50);
    expect(result.missingInputs).toContain(
      "additional signals (HRV, sleep, prior injury history, subjective wellness) would improve this estimate",
    );
  });
});
