import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchLactateTestStages } = await import("../lactateTestRepository");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    order: () => handler,
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchLactateTestStages", () => {
  it("maps rows from lactate_test_stages into LactateStage", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          { stage_number: 1, speed_mps: 2.5, power_watts: null, heart_rate: 120, blood_lactate_mmol: 1.2 },
          { stage_number: 2, speed_mps: 3.0, power_watts: null, heart_rate: 140, blood_lactate_mmol: 2.5 },
        ],
        error: null,
      }),
    );

    const result = await fetchLactateTestStages("test-1");

    expect(fromMock).toHaveBeenCalledWith("lactate_test_stages");
    expect(result).toEqual([
      { stageNumber: 1, speedMps: 2.5, powerWatts: null, heartRate: 120, bloodLactateMmol: 1.2 },
      { stageNumber: 2, speedMps: 3.0, powerWatts: null, heartRate: 140, bloodLactateMmol: 2.5 },
    ]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("connection reset") }));
    await expect(fetchLactateTestStages("test-1")).rejects.toThrow("connection reset");
  });
});
