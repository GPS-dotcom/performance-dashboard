import { describe, expect, it } from "vitest";
import { calculateLT1 } from "../lt1Calculator";
import type { LactateStage } from "../../models/lactateStage";

const stages: LactateStage[] = [
  { stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 },
  { stageNumber: 2, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
  { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
];

describe("calculateLT1", () => {
  it("interpolates the intensity at 2.0 mmol/L", () => {
    const result = calculateLT1(stages);
    expect(result.value).toEqual({ intensity: 3.0, intensityUnit: "speed_mps", heartRate: 140 });
  });

  it("is unavailable with fewer than 2 stages", () => {
    const result = calculateLT1([stages[0]]);
    expect(result.value).toBeNull();
  });
});
