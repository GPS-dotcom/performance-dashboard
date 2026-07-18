import { describe, expect, it } from "vitest";
import { calculateRecoveryScore } from "../recoveryScore";

describe("calculateRecoveryScore", () => {
  it("scores from TSB alone when no wearable data is available", () => {
    // tsbToScore(10) = ((10+30)/55)*100 = 72.727...
    const result = calculateRecoveryScore({ tsb: 10 });
    expect(result.value).toBeCloseTo(72.727, 2);
    expect(result.dataQuality).toBe("low");
    expect(result.confidence).toBeCloseTo(1 / 3, 5);
    expect(result.missingInputs).toEqual([
      "resting_hr / resting_hr baseline (RecoverySnapshot)",
      "hrv / hrv baseline (RecoverySnapshot)",
    ]);
  });

  it("penalizes elevated resting heart rate vs. baseline", () => {
    const result = calculateRecoveryScore({ tsb: 10, restingHr: 55, restingHrBaseline: 50 });
    // base 72.727 - (10% delta * 3) = 72.727 - 30 = 42.727
    expect(result.value).toBeCloseTo(42.727, 2);
    expect(result.dataQuality).toBe("medium");
  });

  it("penalizes depressed HRV vs. baseline", () => {
    const result = calculateRecoveryScore({ tsb: 10, hrv: 40, hrvBaseline: 50 });
    // base 72.727 + (-20% delta * 2) = 72.727 - 40 = 32.727
    expect(result.value).toBeCloseTo(32.727, 2);
  });

  it("reaches high data quality when all three signals are present", () => {
    const result = calculateRecoveryScore({
      tsb: 10,
      restingHr: 55,
      restingHrBaseline: 50,
      hrv: 40,
      hrvBaseline: 50,
    });
    expect(result.dataQuality).toBe("high");
    expect(result.confidence).toBeCloseTo(1, 6);
    expect(result.missingInputs).toEqual([]);
    // 72.727 - 30 - 40 = 2.727
    expect(result.value).toBeCloseTo(2.727, 2);
  });

  it("does not reward a lower resting HR or higher HRV beyond the TSB baseline", () => {
    const result = calculateRecoveryScore({ tsb: 10, restingHr: 45, restingHrBaseline: 50, hrv: 60, hrvBaseline: 50 });
    // negative deltaPercent for resting HR is clamped by max(0, ...); positive HRV delta clamped by min(0, ...)
    expect(result.value).toBeCloseTo(72.727, 2);
  });

  it("clamps the score into [0, 100] for extreme TSB values", () => {
    expect(calculateRecoveryScore({ tsb: -1000 }).value).toBe(0);
    expect(calculateRecoveryScore({ tsb: 1000 }).value).toBe(100);
  });
});
