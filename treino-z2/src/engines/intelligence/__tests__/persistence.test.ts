import { afterEach, describe, expect, it, vi } from "vitest";
import type { Insight } from "../types";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { saveInsight } = await import("../persistence");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    insert: () => handler,
    select: () => handler,
    single: async () => result,
  };
  return handler;
}

const insight: Insight = {
  kind: "trend",
  metricName: "CTL",
  severity: "info",
  confidence: 0.8,
  explanation: "CTL is improving.",
  sourceMetrics: { slope: 2 },
  recommendation: null,
};

afterEach(() => {
  fromMock.mockReset();
});

describe("saveInsight", () => {
  it("inserts a row into the insights table with recommendation left null", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "insight-1" }, error: null }));

    const result = await saveInsight("athlete-1", insight);

    expect(result).toEqual({ id: "insight-1" });
    expect(fromMock).toHaveBeenCalledWith("insights");
  });

  it("returns null and logs when persistence fails, without throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "db unreachable" } }));

    const result = await saveInsight("athlete-1", insight);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
