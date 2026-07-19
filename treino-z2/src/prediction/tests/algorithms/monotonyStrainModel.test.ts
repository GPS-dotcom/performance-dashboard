import { describe, expect, it } from "vitest";
import { monotonyStrainModel, predictMonotonyRisk } from "../../algorithms/monotonyStrainModel";

describe("predictMonotonyRisk", () => {
  it("returns an unavailable output with fewer than 7 days of data", () => {
    const output = predictMonotonyRisk({ dailyLoads: [10, 20, 30] });
    expect(output.value).toBeNull();
    expect(output.missingInputs).toEqual(["fewer than 7 days of daily load data"]);
  });

  it("reports maximal risk when daily load has zero variability (undefined monotony)", () => {
    const output = predictMonotonyRisk({ dailyLoads: [50, 50, 50, 50, 50, 50, 50] });
    expect(output.value!.monotony).toBe(Infinity);
    expect(output.value!.riskScore).toBe(100);
    expect(output.value!.riskLevel).toBe("high");
  });

  it("classifies highly variable daily load (low monotony) as low risk", () => {
    // mean=300/7~=42.857, stddev~=49.487, monotony~=0.866 -- well under 1.5
    const output = predictMonotonyRisk({ dailyLoads: [0, 100, 0, 100, 0, 100, 0] });
    expect(output.value!.riskLevel).toBe("low");
    expect(output.value!.riskScore).toBe(20);
    expect(output.value!.monotony).toBeCloseTo(0.866, 2);
  });

  it("classifies moderately variable daily load as moderate risk", () => {
    // mean=260/7~=37.143, stddev~=21.853, monotony~=1.6996 -- in [1.5, 2.0)
    const output = predictMonotonyRisk({ dailyLoads: [20, 50, 20, 50, 20, 80, 20] });
    expect(output.value!.riskLevel).toBe("moderate");
    expect(output.value!.riskScore).toBe(45);
    expect(output.value!.monotony).toBeCloseTo(1.6996, 3);
  });

  it("classifies low day-to-day variability (high monotony) as high risk", () => {
    // an evenly increasing sequence has a small stddev relative to its mean
    const output = predictMonotonyRisk({ dailyLoads: [40, 42, 44, 46, 48, 50, 52] });
    expect(output.value!.monotony).toBeGreaterThanOrEqual(2.0);
    expect(output.value!.riskLevel).toBe("high");
    expect(output.value!.riskScore).toBeGreaterThan(70);
  });

  it("computes strain as total weekly load times monotony", () => {
    const output = predictMonotonyRisk({ dailyLoads: [20, 50, 20, 50, 20, 80, 20] });
    const total = 20 + 50 + 20 + 50 + 20 + 80 + 20;
    expect(output.value!.strain).toBeCloseTo(total * output.value!.monotony, 5);
  });
});

describe("monotonyStrainModel", () => {
  it("exposes a stable modelId and delegates to predictMonotonyRisk", () => {
    expect(monotonyStrainModel.modelId).toBe("foster-monotony-strain");
    expect(monotonyStrainModel.predict({ dailyLoads: [0, 100, 0, 100, 0, 100, 0] }).value!.riskLevel).toBe("low");
  });
});
