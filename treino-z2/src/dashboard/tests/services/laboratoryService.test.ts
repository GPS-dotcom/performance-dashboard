import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchLactateTests } = await import("../../services/laboratoryService");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    order: () => handler,
    limit: async () => result,
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchLactateTests", () => {
  it("maps rows from snake_case to camelCase", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({ data: [{ id: "t1", test_date: "2026-06-01", test_type: "power", notes: "Ramp test" }], error: null }),
    );
    const result = await fetchLactateTests("athlete-1");
    expect(result).toEqual([{ id: "t1", testDate: "2026-06-01", testType: "power", notes: "Ramp test" }]);
  });

  it("returns [] (not a thrown error) when the query errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: 'relation "lactate_tests" does not exist' } }));
    expect(await fetchLactateTests("athlete-1")).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns [] (not a thrown error) when the client itself throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => {
      throw new Error("network down");
    });
    expect(await fetchLactateTests("athlete-1")).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
