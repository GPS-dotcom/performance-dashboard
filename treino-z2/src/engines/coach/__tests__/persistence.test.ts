import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoachAlert, Recommendation } from "../types";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { saveAlert, saveRecommendation } = await import("../persistence");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    insert: () => handler,
    select: () => handler,
    single: async () => result,
  };
  return handler;
}

const recommendation: Recommendation = {
  recommendation: "Easy Run",
  reason: "Fatigue increased.",
  evidence: ["ATL increased"],
  confidence: 0.92,
  expectedOutcome: "Improved recovery.",
  alternative: null,
};

const alert: CoachAlert = {
  kind: "high_injury_risk",
  severity: "critical",
  message: "Injury risk is elevated.",
  evidence: ["Injury risk: high"],
};

afterEach(() => {
  fromMock.mockReset();
});

describe("saveRecommendation", () => {
  it("inserts a row into the recommendations table", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "rec-1" }, error: null }));
    const result = await saveRecommendation("athlete-1", "training", recommendation);
    expect(result).toEqual({ id: "rec-1" });
    expect(fromMock).toHaveBeenCalledWith("recommendations");
  });

  it("returns null and logs when persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "db unreachable" } }));
    const result = await saveRecommendation("athlete-1", "training", recommendation);
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("saveAlert", () => {
  it("inserts a row into the coach_alerts table", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "alert-1" }, error: null }));
    const result = await saveAlert("athlete-1", alert);
    expect(result).toEqual({ id: "alert-1" });
    expect(fromMock).toHaveBeenCalledWith("coach_alerts");
  });

  it("returns null and logs when persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "db unreachable" } }));
    const result = await saveAlert("athlete-1", alert);
    expect(result).toBeNull();
    errorSpy.mockRestore();
  });
});
