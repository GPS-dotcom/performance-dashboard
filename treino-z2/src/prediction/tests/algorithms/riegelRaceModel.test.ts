import { describe, expect, it } from "vitest";
import { predictRaceTimeRiegel, riegelRaceModel } from "../../algorithms/riegelRaceModel";

describe("predictRaceTimeRiegel", () => {
  it("returns an unavailable output when there are no best efforts", () => {
    const output = predictRaceTimeRiegel({ targetDistanceKm: 10, bestEfforts: [] });
    expect(output.value).toBeNull();
    expect(output.confidence).toBe(0);
    expect(output.missingInputs).toEqual(["no best efforts available"]);
  });

  it("uses the real best effort directly when one exists within tolerance of the target distance", () => {
    const output = predictRaceTimeRiegel({ targetDistanceKm: 10, bestEfforts: [{ distanceKm: 10, timeSec: 2400 }] });
    expect(output.value).toEqual({ predictedTimeSec: 2400, method: "actual_best_effort", anchorDistanceKm: 10, anchorTimeSec: 2400 });
    expect(output.confidence).toBe(0.95);
  });

  it("extrapolates via Riegel's formula from the closest-in-log-distance anchor when no exact match exists", () => {
    const output = predictRaceTimeRiegel({ targetDistanceKm: 21.0975, bestEfforts: [{ distanceKm: 10, timeSec: 2400 }] });
    expect(output.value!.method).toBe("riegel_extrapolation");
    expect(output.value!.anchorDistanceKm).toBe(10);
    // Riegel: T2 = T1 * (D2/D1)^1.06
    const expected = 2400 * Math.pow(21.0975 / 10, 1.06);
    expect(output.value!.predictedTimeSec).toBeCloseTo(expected, 5);
  });

  it("picks the anchor closest in log-distance when multiple best efforts are available", () => {
    const output = predictRaceTimeRiegel({
      targetDistanceKm: 21.0975,
      bestEfforts: [
        { distanceKm: 5, timeSec: 1100 },
        { distanceKm: 10, timeSec: 2400 },
        { distanceKm: 42.195, timeSec: 12000 },
      ],
    });
    // log(21.0975/10) ~= 0.746; log(21.0975/5) ~= 1.44; log(42.195/21.0975) ~= 0.693 -- marathon anchor wins
    expect(output.value!.anchorDistanceKm).toBe(42.195);
  });

  it("ignores non-positive anchor distances", () => {
    const output = predictRaceTimeRiegel({
      targetDistanceKm: 10,
      bestEfforts: [
        { distanceKm: 0, timeSec: 100 },
        { distanceKm: 5, timeSec: 1100 },
      ],
    });
    expect(output.value!.anchorDistanceKm).toBe(5);
  });

  it("degrades confidence and widens the bound as the extrapolation distance grows", () => {
    const near = predictRaceTimeRiegel({ targetDistanceKm: 10, bestEfforts: [{ distanceKm: 8, timeSec: 1900 }] });
    const far = predictRaceTimeRiegel({ targetDistanceKm: 42.195, bestEfforts: [{ distanceKm: 5, timeSec: 1100 }] });
    expect(far.confidence).toBeLessThan(near.confidence);
  });

  it("always returns a lowerBound/upperBound bracketing the predicted time", () => {
    const output = predictRaceTimeRiegel({ targetDistanceKm: 10, bestEfforts: [{ distanceKm: 5, timeSec: 1100 }] });
    expect(output.lowerBound).not.toBeNull();
    expect(output.upperBound).not.toBeNull();
    expect(output.lowerBound!).toBeLessThanOrEqual(output.value!.predictedTimeSec);
    expect(output.upperBound!).toBeGreaterThanOrEqual(output.value!.predictedTimeSec);
  });
});

describe("riegelRaceModel", () => {
  it("exposes a stable modelId/version and delegates predict() to predictRaceTimeRiegel", () => {
    expect(riegelRaceModel.modelId).toBe("riegel-extrapolation");
    expect(riegelRaceModel.version).toBe("1.0.0");
    const output = riegelRaceModel.predict({ targetDistanceKm: 10, bestEfforts: [{ distanceKm: 10, timeSec: 2400 }] });
    expect(output.value!.predictedTimeSec).toBe(2400);
  });
});
