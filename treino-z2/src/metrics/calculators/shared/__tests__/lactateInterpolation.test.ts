import { describe, expect, it } from "vitest";
import { interpolateAtLactate, lactateThresholdResult } from "../lactateInterpolation";
import type { LactateStage } from "../../../models/lactateStage";

const stages: LactateStage[] = [
  { stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 },
  { stageNumber: 2, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
  { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
  { stageNumber: 4, speedMps: 4.0, heartRate: 175, bloodLactateMmol: 7.0 },
];

describe("interpolateAtLactate", () => {
  it("returns the exact stage when its lactate matches the target", () => {
    const result = interpolateAtLactate(stages, 2.0);
    expect(result).toEqual({ intensity: 3.0, intensityUnit: "speed_mps", heartRate: 140 });
  });

  it("linearly interpolates between two bracketing stages", () => {
    // Between stage 2 (2.0 mmol, 3.0 m/s, 140 bpm) and stage 3 (4.0 mmol, 3.5 m/s, 160 bpm),
    // target 3.0 mmol is exactly halfway.
    const result = interpolateAtLactate(stages, 3.0);
    expect(result).toEqual({ intensity: 3.25, intensityUnit: "speed_mps", heartRate: 150 });
  });

  it("returns null when the target lactate is outside the tested range", () => {
    expect(interpolateAtLactate(stages, 10)).toBeNull();
  });

  it("returns null with fewer than 2 usable stages", () => {
    expect(interpolateAtLactate([stages[0]], 2.0)).toBeNull();
  });

  it("sorts unordered input by stage number before interpolating", () => {
    const shuffled = [stages[2], stages[0], stages[3], stages[1]];
    expect(interpolateAtLactate(shuffled, 3.0)).toEqual({ intensity: 3.25, intensityUnit: "speed_mps", heartRate: 150 });
  });

  it("returns null when bracketing stages use mismatched intensity units", () => {
    const mixed: LactateStage[] = [
      { stageNumber: 1, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
      { stageNumber: 2, powerWatts: 250, heartRate: 160, bloodLactateMmol: 4.0 },
    ];
    expect(interpolateAtLactate(mixed, 3.0)).toBeNull();
  });

  it("omits heart rate from the result when either bracketing stage lacks it", () => {
    const noHr: LactateStage[] = [
      { stageNumber: 1, speedMps: 3.0, heartRate: null, bloodLactateMmol: 2.0 },
      { stageNumber: 2, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
    ];
    expect(interpolateAtLactate(noHr, 3.0)!.heartRate).toBeNull();
  });
});

describe("lactateThresholdResult", () => {
  it("returns unavailable with fewer than 2 stages", () => {
    const result = lactateThresholdResult([stages[0]], 2.0);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("fewer than 2 stages");
  });

  it("returns unavailable when the target isn't bracketed", () => {
    const result = lactateThresholdResult(stages, 10);
    expect(result.value).toBeNull();
  });

  it("returns high data quality and 0.85 confidence with >= 4 stages", () => {
    const result = lactateThresholdResult(stages, 2.0);
    expect(result.dataQuality).toBe("high");
    expect(result.confidence).toBe(0.85);
  });

  it("returns medium data quality and 0.65 confidence with < 4 stages", () => {
    const result = lactateThresholdResult(stages.slice(0, 3), 2.0);
    expect(result.dataQuality).toBe("medium");
    expect(result.confidence).toBe(0.65);
  });
});
