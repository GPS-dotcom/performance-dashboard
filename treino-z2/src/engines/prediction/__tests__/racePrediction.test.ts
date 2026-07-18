import { describe, expect, it } from "vitest";
import { predict10K, predictHalfMarathon, predictMarathon, predictRaceTime } from "../racePrediction";

describe("predictRaceTime", () => {
  it("uses the real best effort directly when one exists close to the target distance", () => {
    const result = predictRaceTime(5, [{ distanceKm: 5.01, timeSec: 1200 }]);
    expect(result.value).toEqual({
      targetDistanceKm: 5,
      predictedTimeSec: 1200,
      method: "actual_best_effort",
      anchorDistanceKm: 5.01,
      anchorTimeSec: 1200,
    });
    expect(result.confidence).toBe(0.95);
    expect(result.dataQuality).toBe("high");
  });

  it("extrapolates via Riegel's formula from a 10K to a marathon", () => {
    const result = predictRaceTime(42.195, [{ distanceKm: 10, timeSec: 2400 }]);
    expect(result.value!.method).toBe("riegel_extrapolation");
    expect(result.value!.predictedTimeSec).toBeCloseTo(11040.478, 2);
    expect(result.confidence).toBeCloseTo(0.438139, 5);
    expect(result.dataQuality).toBe("low"); // large extrapolation (10K -> 42K)
  });

  it("gives higher confidence for a closer anchor (half -> 10K) than a farther one (10K -> marathon)", () => {
    const close = predictRaceTime(10, [{ distanceKm: 21.0975, timeSec: 5400 }]);
    const far = predictRaceTime(42.195, [{ distanceKm: 10, timeSec: 2400 }]);
    expect(close.confidence).toBeCloseTo(0.619622, 5);
    expect(close.confidence).toBeGreaterThan(far.confidence);
    expect(close.dataQuality).toBe("medium");
  });

  it("picks the anchor closest in log-distance when multiple best efforts are available", () => {
    // |ln(10/5)| = 0.693 vs |ln(10/42.195)| = 1.440 -- the 5K is unambiguously closer to a 10K target.
    const result = predictRaceTime(10, [
      { distanceKm: 5, timeSec: 1200 },
      { distanceKm: 42.195, timeSec: 12600 },
    ]);
    expect(result.value!.anchorDistanceKm).toBe(5);
  });

  it("is unavailable with no best efforts", () => {
    const result = predictRaceTime(10, []);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("no best efforts available");
  });
});

describe("named distance wrappers", () => {
  it("predict10K targets exactly 10km", () => {
    const result = predict10K([{ distanceKm: 5, timeSec: 1200 }]);
    expect(result.value!.targetDistanceKm).toBe(10);
  });

  it("predictHalfMarathon targets exactly 21.0975km", () => {
    const result = predictHalfMarathon([{ distanceKm: 10, timeSec: 2400 }]);
    expect(result.value!.targetDistanceKm).toBe(21.0975);
  });

  it("predictMarathon targets exactly 42.195km", () => {
    const result = predictMarathon([{ distanceKm: 10, timeSec: 2400 }]);
    expect(result.value!.targetDistanceKm).toBe(42.195);
  });
});
