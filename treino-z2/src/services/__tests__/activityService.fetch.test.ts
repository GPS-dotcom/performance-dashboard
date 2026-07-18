import { afterEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("../../api/supabaseClient", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

const { fetchRecentActivities, fetchMetricsHistory } = await import("../activityService");

// The real Supabase query builder is thenable at every step of the chain
// (e.g. both `.order(...)` and `.order(...).limit(...)` can be awaited
// directly), so this fake must be too.
function chainResolving(result: { data?: unknown; error?: unknown }) {
  const handler: Record<string, unknown> = {
    select: () => handler,
    order: () => handler,
    limit: () => handler,
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return handler;
}

afterEach(() => {
  fromMock.mockReset();
});

describe("fetchRecentActivities", () => {
  it("maps every row from strava_activities into an Activity", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({
        data: [
          {
            id: 1,
            name: "Easy Run",
            start_date: "2026-07-17",
            distance_m: 8000,
            moving_time_s: 2400,
            average_heartrate: 140,
            average_watts: null,
            weighted_average_watts: null,
            rtss: 45,
            best_efforts: null,
            zone_minutes: null,
          },
        ],
        error: null,
      }),
    );

    const result = await fetchRecentActivities();

    expect(fromMock).toHaveBeenCalledWith("strava_activities");
    expect(result).toEqual([
      {
        id: 1,
        name: "Easy Run",
        startDate: "2026-07-17",
        distanceM: 8000,
        movingTimeS: 2400,
        averageHeartrate: 140,
        averageWatts: null,
        weightedAverageWatts: null,
        rtss: 45,
        bestEfforts: null,
        zoneMinutes: null,
      },
    ]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("connection reset") }));
    await expect(fetchRecentActivities()).rejects.toThrow("connection reset");
  });
});

describe("fetchMetricsHistory", () => {
  it("maps every row from daily_pmc into a MetricsSnapshot", async () => {
    fromMock.mockImplementationOnce(() =>
      chainResolving({ data: [{ date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 }], error: null }),
    );

    const result = await fetchMetricsHistory();

    expect(fromMock).toHaveBeenCalledWith("daily_pmc");
    expect(result).toEqual([{ date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 }]);
  });

  it("throws the underlying error when the query fails", async () => {
    fromMock.mockImplementationOnce(() => chainResolving({ data: null, error: new Error("timeout") }));
    await expect(fetchMetricsHistory()).rejects.toThrow("timeout");
  });
});
