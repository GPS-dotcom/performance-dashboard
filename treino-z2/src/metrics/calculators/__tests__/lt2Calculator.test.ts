import { describe, expect, it } from "vitest";
import { calculateLT2 } from "../lt2Calculator";
import type { LactateStage } from "../../models/lactateStage";

const stages: LactateStage[] = [
  { stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 },
  { stageNumber: 2, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
  { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
];

describe("calculateLT2", () => {
  it("interpolates the intensity at 4.0 mmol/L", () => {
    const result = calculateLT2(stages);
    expect(result.value).toEqual({ intensity: 3.5, intensityUnit: "speed_mps", heartRate: 160 });
  });

  it("is unavailable when 4.0 mmol/L is outside the tested range", () => {
    const shortTest: LactateStage[] = [
      { stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 },
      { stageNumber: 2, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
    ];
    expect(calculateLT2(shortTest).value).toBeNull();
  });
});
