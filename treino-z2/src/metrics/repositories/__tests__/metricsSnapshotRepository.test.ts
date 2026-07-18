import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchMetricsSnapshotHistory, upsertMetricsSnapshot } = await import("../metricsSnapshotRepository");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    gte: () => handler,
    order: () => handler,
    upsert: () => handler,
    single: async () => result,
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchMetricsSnapshotHistory", () => {
  it("maps rows from metrics_snapshots into TrainingLoadPoint", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({ data: [{ date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 }], error: null }),
    );

    const result = await fetchMetricsSnapshotHistory("athlete-1", 400);

    expect(fromMock).toHaveBeenCalledWith("metrics_snapshots");
    expect(result).toEqual([{ date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 }]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchMetricsSnapshotHistory("athlete-1", 400)).rejects.toThrow("timeout");
  });
});

describe("upsertMetricsSnapshot", () => {
  it("upserts a point and returns the new row id", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "snap-1" }, error: null }));

    const result = await upsertMetricsSnapshot("athlete-1", { date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 });

    expect(result).toEqual({ id: "snap-1" });
  });

  it("returns null and logs instead of throwing when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "conflict" } }));

    const result = await upsertMetricsSnapshot("athlete-1", { date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
