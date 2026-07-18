import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchUpcomingGoal } = await import("../goalService");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    not: () => handler,
    gte: () => handler,
    order: () => handler,
    limit: () => handler,
    maybeSingle: async () => result,
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchUpcomingGoal", () => {
  it("returns the mapped goal when one is found", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({ data: { id: "g1", label: "Chicago Marathon", kind: "marathon", target_date: "2026-10-11" }, error: null }),
    );
    const result = await fetchUpcomingGoal();
    expect(result).toEqual({ id: "g1", label: "Chicago Marathon", kind: "marathon", targetDate: "2026-10-11" });
  });

  it("returns null when no goal is found", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: null }));
    expect(await fetchUpcomingGoal()).toBeNull();
  });

  it("returns null (not a thrown error) when the query errors, e.g. the table doesn't exist yet", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: 'relation "goals" does not exist' } }));
    const result = await fetchUpcomingGoal();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns null (not a thrown error) when the client itself throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => {
      throw new Error("network down");
    });
    const result = await fetchUpcomingGoal();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
