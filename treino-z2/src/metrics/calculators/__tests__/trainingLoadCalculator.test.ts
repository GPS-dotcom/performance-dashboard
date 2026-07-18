import { describe, expect, it } from "vitest";
import { calculateTrainingLoad } from "../trainingLoadCalculator";

describe("calculateTrainingLoad", () => {
  it("computes power-based TSS when NP and FTP are present: 1 hour at FTP = 100", () => {
    const result = calculateTrainingLoad({ durationSec: 3600, normalizedPowerWatts: 250, ftpWatts: 250 });
    expect(result.value!.method).toBe("power_tss");
    expect(result.value!.load).toBeCloseTo(100, 5);
    expect(result.value!.intensityFactor).toBeCloseTo(1, 5);
  });

  it("scales power-based TSS with the square of intensity factor", () => {
    // IF = 0.5, 1 hour: TSS = 3600 * 0.25 / 3600 * 100 = 25.
    const result = calculateTrainingLoad({ durationSec: 3600, normalizedPowerWatts: 125, ftpWatts: 250 });
    expect(result.value!.load).toBeCloseTo(25, 5);
  });

  it("falls back to HR-based hrTSS when power is unavailable", () => {
    const result = calculateTrainingLoad({ durationSec: 3600, averageHeartRate: 150, thresholdHeartRate: 150 });
    expect(result.value!.method).toBe("hr_tss");
    expect(result.value!.load).toBeCloseTo(100, 5);
    expect(result.dataQuality).toBe("medium");
  });

  it("falls back to session-RPE when neither power nor HR threshold is available", () => {
    const result = calculateTrainingLoad({ durationSec: 3600, rpe: 6 });
    expect(result.value!.method).toBe("session_rpe");
    expect(result.value!.load).toBeCloseTo(6 * 60, 5); // RPE * duration in minutes
    expect(result.value!.intensityFactor).toBeNull();
    expect(result.dataQuality).toBe("low");
  });

  it("prefers power over HR when both are present", () => {
    const result = calculateTrainingLoad({
      durationSec: 3600,
      normalizedPowerWatts: 250,
      ftpWatts: 250,
      averageHeartRate: 999,
      thresholdHeartRate: 100,
    });
    expect(result.value!.method).toBe("power_tss");
  });

  it("prefers HR over RPE when both are present", () => {
    const result = calculateTrainingLoad({ durationSec: 3600, averageHeartRate: 150, thresholdHeartRate: 150, rpe: 9 });
    expect(result.value!.method).toBe("hr_tss");
  });

  it("is unavailable with no duration", () => {
    expect(calculateTrainingLoad({ durationSec: 0, rpe: 5 }).value).toBeNull();
  });

  it("is unavailable when none of power, HR-threshold or RPE are provided", () => {
    const result = calculateTrainingLoad({ durationSec: 3600 });
    expect(result.value).toBeNull();
  });
});
