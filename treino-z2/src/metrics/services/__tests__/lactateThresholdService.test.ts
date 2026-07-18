import { afterEach, describe, expect, it, vi } from "vitest";
import type { LactateStage } from "../../models/lactateStage";

const fetchLactateTestStages = vi.fn<() => Promise<LactateStage[]>>();

vi.mock("../../repositories/lactateTestRepository", () => ({
  fetchLactateTestStages: () => fetchLactateTestStages(),
}));

const { computeLactateThresholds } = await import("../lactateThresholdService");

afterEach(() => {
  vi.resetAllMocks();
});

describe("computeLactateThresholds", () => {
  it("runs both LT1 and LT2 over the same fetched stages", async () => {
    fetchLactateTestStages.mockResolvedValue([
      { stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 },
      { stageNumber: 2, speedMps: 3.0, heartRate: 140, bloodLactateMmol: 2.0 },
      { stageNumber: 3, speedMps: 3.5, heartRate: 160, bloodLactateMmol: 4.0 },
    ]);

    const result = await computeLactateThresholds("test-1");

    expect(result.lt1.value).toEqual({ intensity: 3.0, intensityUnit: "speed_mps", heartRate: 140 });
    expect(result.lt2.value).toEqual({ intensity: 3.5, intensityUnit: "speed_mps", heartRate: 160 });
  });

  it("both thresholds are unavailable when the test has too few stages", async () => {
    fetchLactateTestStages.mockResolvedValue([{ stageNumber: 1, speedMps: 2.5, heartRate: 120, bloodLactateMmol: 1.0 }]);

    const result = await computeLactateThresholds("test-1");

    expect(result.lt1.value).toBeNull();
    expect(result.lt2.value).toBeNull();
  });
});
