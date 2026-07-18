import { afterEach, describe, expect, it, vi } from "vitest";
import type { RawStravaActivity, RawStravaLap, RawStravaStreams } from "../types";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { importActivity, archiveActivity } = await import("../activityEngine");
const { clearActivityEventHandlers, onActivityEvent } = await import("../eventBus");

/** A Supabase PostgrestBuilder-like chain: every method returns itself, and it's awaitable directly. */
function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    eq: () => handler,
    upsert: () => handler,
    update: () => handler,
    insert: () => handler,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return handler;
}

function makeRaw(overrides: Partial<RawStravaActivity> = {}): RawStravaActivity {
  return {
    id: 999,
    name: "Longão",
    type: "Run",
    start_date: "2026-07-10T08:00:00Z",
    moving_time: 6000,
    elapsed_time: 6100,
    distance: 20000,
    ...overrides,
  };
}

const okResult = { data: null, error: null };

afterEach(() => {
  fromMock.mockReset();
  clearActivityEventHandlers();
});

describe("importActivity", () => {
  it("rejects without persisting when validation fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving(okResult)); // activity_events insert

    const result = await importActivity({ athleteId: "athlete-1", activity: makeRaw({ start_date: "" }) });

    expect(result).toEqual({ outcome: "rejected", errors: ["Missing Start Time."] });
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("activity_events");
  });

  it("creates a new activity, laps and records, and publishes activity_created", async () => {
    const handler = vi.fn();
    onActivityEvent("activity_created", handler);

    fromMock
      .mockImplementationOnce(() => chainResolving({ data: null, error: null })) // lookup: no existing activity
      .mockImplementationOnce(() => chainResolving({ data: { id: "act-1" }, error: null })) // upsert activity
      .mockImplementationOnce(() => chainResolving({ error: null })) // laps upsert
      .mockImplementationOnce(() => chainResolving({ error: null })) // records upsert
      .mockImplementationOnce(() => chainResolving({ error: null })) // status update
      .mockImplementationOnce(() => chainResolving({ error: null })); // activity_events insert

    const laps: RawStravaLap[] = [{ lap_index: 1, distance: 20000, moving_time: 6000, average_speed: 3.33 }];
    const streams: RawStravaStreams = { time: [0, 5], latlng: [[-23.5, -46.6], [-23.501, -46.601]] };

    const result = await importActivity({ athleteId: "athlete-1", activity: makeRaw(), laps, streams });

    expect(result).toEqual({ outcome: "created", activityId: "act-1" });
    expect(fromMock.mock.calls.map((c) => c[0])).toEqual([
      "activities",
      "activities",
      "laps",
      "records",
      "activities",
      "activity_events",
    ]);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: "athlete-1", activityId: "act-1", eventType: "activity_created" }),
    );
  });

  it("returns 'updated' (not 'created') when the activity already exists", async () => {
    fromMock
      .mockImplementationOnce(() => chainResolving({ data: { id: "act-1" }, error: null })) // lookup: found
      .mockImplementationOnce(() => chainResolving({ data: { id: "act-1" }, error: null })) // upsert
      .mockImplementationOnce(() => chainResolving({ error: null })) // status update
      .mockImplementationOnce(() => chainResolving({ error: null })); // activity_events insert

    const result = await importActivity({ athleteId: "athlete-1", activity: makeRaw() });

    expect(result).toEqual({ outcome: "updated", activityId: "act-1" });
  });

  it("returns 'failed' with the errors when laps persistence fails, but keeps the activity row", async () => {
    fromMock
      .mockImplementationOnce(() => chainResolving({ data: null, error: null })) // lookup
      .mockImplementationOnce(() => chainResolving({ data: { id: "act-1" }, error: null })) // upsert activity
      .mockImplementationOnce(() => chainResolving({ error: { message: "constraint violation" } })) // laps upsert fails
      .mockImplementationOnce(() => chainResolving({ error: null })) // status update -> 'failed'
      .mockImplementationOnce(() => chainResolving({ error: null })); // activity_events insert

    const laps: RawStravaLap[] = [{ lap_index: 1, average_speed: 3.33 }];
    const result = await importActivity({ athleteId: "athlete-1", activity: makeRaw(), laps });

    expect(result.outcome).toBe("failed");
    if (result.outcome === "failed") {
      expect(result.activityId).toBe("act-1");
      expect(result.errors).toEqual(["Laps: constraint violation"]);
    }
  });

  it("rejects when the initial lookup query errors", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: { message: "db unreachable" } }));

    const result = await importActivity({ athleteId: "athlete-1", activity: makeRaw() });

    expect(result).toEqual({ outcome: "rejected", errors: ["db unreachable"] });
  });
});

describe("archiveActivity", () => {
  it("sets archived_at and publishes activity_archived", async () => {
    const handler = vi.fn();
    onActivityEvent("activity_archived", handler);

    fromMock
      .mockImplementationOnce(() => chainResolving({ error: null })) // update archived_at
      .mockImplementationOnce(() => chainResolving({ error: null })); // activity_events insert

    await archiveActivity("athlete-1", "act-1");

    expect(fromMock.mock.calls.map((c) => c[0])).toEqual(["activities", "activity_events"]);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: "athlete-1", activityId: "act-1", eventType: "activity_archived" }),
    );
  });

  it("throws and does not publish an event when the update fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ error: { message: "not found" } }));

    await expect(archiveActivity("athlete-1", "missing")).rejects.toEqual({ message: "not found" });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
