import { describe, expect, it } from "vitest";
import { calculateRecoveryScore } from "../recoveryScoreCalculator";

describe("calculateRecoveryScore", () => {
  it("scores TSB=0 (neutral) around the middle of the 0-100 band", () => {
    const result = calculateRecoveryScore({ tsb: 0 });
    expect(result.value).toBeCloseTo((30 / 55) * 100, 5);
  });

  it("scores a very fresh TSB near 100", () => {
    const result = calculateRecoveryScore({ tsb: 25 });
    expect(result.value).toBeCloseTo(100, 5);
  });

  it("scores a very fatigued TSB near 0", () => {
    const result = calculateRecoveryScore({ tsb: -30 });
    expect(result.value).toBeCloseTo(0, 5);
  });

  it("clamps TSB beyond the -30..25 band instead of exceeding 0-100", () => {
    expect(calculateRecoveryScore({ tsb: -100 }).value).toBeCloseTo(0, 5);
    expect(calculateRecoveryScore({ tsb: 100 }).value).toBeCloseTo(100, 5);
  });

  it("reports low data quality with only TSB", () => {
    const result = calculateRecoveryScore({ tsb: 0 });
    expect(result.dataQuality).toBe("low");
    expect(result.missingInputs).toHaveLength(2);
  });

  it("penalizes an elevated resting HR vs. baseline", () => {
    const base = calculateRecoveryScore({ tsb: 0 });
    const elevated = calculateRecoveryScore({ tsb: 0, restingHr: 55, restingHrBaseline: 50 });
    expect(elevated.value!).toBeLessThan(base.value!);
    expect(elevated.dataQuality).toBe("medium");
  });

  it("does not reward a resting HR below baseline", () => {
    const base = calculateRecoveryScore({ tsb: 0 });
    const lower = calculateRecoveryScore({ tsb: 0, restingHr: 45, restingHrBaseline: 50 });
    expect(lower.value).toBe(base.value);
  });

  it("penalizes depressed HRV vs. baseline", () => {
    const base = calculateRecoveryScore({ tsb: 0 });
    const depressed = calculateRecoveryScore({ tsb: 0, hrv: 40, hrvBaseline: 50 });
    expect(depressed.value!).toBeLessThan(base.value!);
  });

  it("does not reward HRV above baseline", () => {
    const base = calculateRecoveryScore({ tsb: 0 });
    const higher = calculateRecoveryScore({ tsb: 0, hrv: 60, hrvBaseline: 50 });
    expect(higher.value).toBe(base.value);
  });

  it("reports high data quality with all three signals present", () => {
    const result = calculateRecoveryScore({
      tsb: 0,
      restingHr: 50,
      restingHrBaseline: 50,
      hrv: 50,
      hrvBaseline: 50,
    });
    expect(result.dataQuality).toBe("high");
    expect(result.missingInputs).toEqual([]);
    expect(result.confidence).toBe(1);
  });
});
