import { afterEach, describe, expect, it, vi } from "vitest";
import type { PredictionRecord } from "../persistence";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { savePrediction } = await import("../persistence");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    insert: () => handler,
    select: () => handler,
    single: async () => result,
  };
  return handler;
}

const record: PredictionRecord = {
  kind: "race_prediction",
  targetDistanceKm: 42.195,
  predictedValue: 11040.5,
  unit: "seconds",
  confidence: 0.44,
  sourceMetrics: { anchorDistanceKm: 10 },
};

afterEach(() => {
  fromMock.mockReset();
});

describe("savePrediction", () => {
  it("inserts a row into the predictions table", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "pred-1" }, error: null }));

    const result = await savePrediction("athlete-1", record);

    expect(result).toEqual({ id: "pred-1" });
    expect(fromMock).toHaveBeenCalledWith("predictions");
  });

  it("returns null and logs when persistence fails, without throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "db unreachable" } }));

    const result = await savePrediction("athlete-1", record);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
