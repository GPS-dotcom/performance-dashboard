import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchRecentAlerts, saveAlert } = await import("../../repositories/alertRepository");
const { AlertFactory } = await import("../../alerts/alertFactory");

function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    order: () => handler,
    limit: () => handler,
    upsert: () => handler,
    single: async () => result,
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

function makeAlert() {
  return AlertFactory.create({
    category: "injury_risk",
    kind: "high_injury_risk",
    severity: "critical",
    title: "High Injury Risk",
    description: "Injury risk is elevated.",
    actionRequired: "Reduce load.",
    generatedAt: "2026-07-18T10:00:00.000Z",
  });
}

describe("saveAlert", () => {
  it("upserts onto the coach_alerts table keyed by (athlete_id, client_alert_id)", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: { id: "row-1" }, error: null }));
    const result = await saveAlert("athlete-1", makeAlert());
    expect(fromMock).toHaveBeenCalledWith("coach_alerts");
    expect(result).toEqual({ id: "row-1" });
  });

  it("populates the legacy kind/message columns for backward compatibility", async () => {
    const upsertSpy = vi.fn((_payload: Record<string, unknown>) => handler);
    const handler: Record<string, unknown> = { upsert: upsertSpy, select: () => handler, single: async () => ({ data: { id: "row-1" }, error: null }) };
    fromMock.mockImplementationOnce(() => handler);

    const alert = makeAlert();
    await saveAlert("athlete-1", alert);

    const payload = upsertSpy.mock.calls[0][0];
    expect(payload.kind).toBe("injury_risk");
    expect(payload.message).toBe("Injury risk is elevated.");
    expect(payload.severity).toBe("critical");
    expect(payload.client_alert_id).toBe(alert.id);
  });

  it("returns null and logs instead of throwing when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "conflict" } }));

    const result = await saveAlert("athlete-1", makeAlert());

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("fetchRecentAlerts", () => {
  it("maps stored rows back into Alert objects", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_alert_id: "alert:high_injury_risk:2026-07-18",
            category: "injury_risk",
            severity: "critical",
            title: "High Injury Risk",
            description: "Injury risk is elevated.",
            action_required: "Reduce load.",
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const result = await fetchRecentAlerts("athlete-1", 10);

    expect(fromMock).toHaveBeenCalledWith("coach_alerts");
    expect(result).toEqual([
      {
        id: "alert:high_injury_risk:2026-07-18",
        severity: "critical",
        category: "injury_risk",
        title: "High Injury Risk",
        description: "Injury risk is elevated.",
        actionRequired: "Reduce load.",
        generatedAt: "2026-07-18T10:00:00.000Z",
      },
    ]);
  });

  it("falls back to defaults when nullable columns come back null", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            client_alert_id: null,
            category: null,
            severity: "warning",
            title: null,
            description: null,
            action_required: null,
            created_at: "2026-07-18T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const [result] = await fetchRecentAlerts("athlete-1", 10);
    expect(result.id).toBe("");
    expect(result.category).toBe("elevated_fatigue");
    expect(result.title).toBe("");
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchRecentAlerts("athlete-1", 10)).rejects.toThrow("timeout");
  });
});
