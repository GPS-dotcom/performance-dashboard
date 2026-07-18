import { describe, expect, it } from "vitest";
import { calculateLT1, calculateLT2 } from "../lactateThreshold";
import type { LactateStage } from "../lactateThreshold";

const stages: LactateStage[] = [
  { stageNumber: 1, speedMps: 2.5, heartRate: 130, bloodLactateMmol: 1.2 },
  { stageNumber: 2, speedMps: 3.0, heartRate: 145, bloodLactateMmol: 2.1 },
  { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.5 },
];

describe("calculateLT1", () => {
  it("interpolates the speed and heart rate at 2.0 mmol/L between the bracketing stages", () => {
    const result = calculateLT1(stages);
    expect(result.value).not.toBeNull();
    // fraction = (2.0 - 1.2) / (2.1 - 1.2) = 0.8888...
    expect(result.value!.intensity).toBeCloseTo(2.9444, 3);
    expect(result.value!.intensityUnit).toBe("speed_mps");
    expect(result.value!.heartRate).toBeCloseTo(143.333, 2);
    expect(result.dataQuality).toBe("medium"); // only 3 stages; "high" needs >= 4
  });

  it("works with power-based stages", () => {
    const powerStages: LactateStage[] = [
      { stageNumber: 1, powerWatts: 200, heartRate: 130, bloodLactateMmol: 1.0 },
      { stageNumber: 2, powerWatts: 250, heartRate: 150, bloodLactateMmol: 3.0 },
    ];
    const result = calculateLT2(powerStages);
    // LT2 target 4.0 is above the max tested lactate (3.0) -- out of range.
    expect(result.value).toBeNull();
    expect(result.missingInputs[0]).toMatch(/no pair of stages brackets/);
  });

  it("returns an exact match without interpolating when a stage lands exactly on the threshold", () => {
    const exact: LactateStage[] = [
      { stageNumber: 1, speedMps: 2.5, heartRate: 130, bloodLactateMmol: 1.0 },
      { stageNumber: 2, speedMps: 3.0, heartRate: 145, bloodLactateMmol: 2.0 },
      { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
    ];
    const result = calculateLT1(exact);
    expect(result.value).toEqual({ intensity: 3.0, intensityUnit: "speed_mps", heartRate: 145 });
  });

  it("is unavailable with fewer than 2 stages", () => {
    const result = calculateLT1([stages[0]]);
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("fewer than 2 stages");
  });
});

describe("calculateLT2", () => {
  it("interpolates the speed and heart rate at 4.0 mmol/L between the bracketing stages", () => {
    const result = calculateLT2(stages);
    // fraction = (4.0 - 2.1) / (4.5 - 2.1) = 0.791666...
    expect(result.value).not.toBeNull();
    expect(result.value!.intensity).toBeCloseTo(3.3958, 3);
    expect(result.value!.heartRate).toBeCloseTo(156.875, 2);
  });

  it("flags missing heart rate when a bracketing stage has none", () => {
    const noHr: LactateStage[] = [
      { stageNumber: 1, speedMps: 3.0, bloodLactateMmol: 2.0 },
      { stageNumber: 2, speedMps: 3.5, bloodLactateMmol: 5.0 },
    ];
    const result = calculateLT2(noHr);
    expect(result.value!.heartRate).toBeNull();
    expect(result.missingInputs).toContain("heart_rate on the bracketing stages");
  });
});
