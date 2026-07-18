import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Activity, MetricsSnapshot } from "../../types";

const fetchRecentActivities = vi.fn<() => Promise<Activity[]>>();
const fetchMetricsHistory = vi.fn<() => Promise<MetricsSnapshot[]>>();

vi.mock("../../services/activityService", () => ({
  fetchRecentActivities: () => fetchRecentActivities(),
  fetchMetricsHistory: () => fetchMetricsHistory(),
}));

// Imported after the mock so the hook picks up the mocked service.
const { useAthleteDashboardData } = await import("../useAthleteDashboardData");

afterEach(() => {
  vi.resetAllMocks();
});

it("resolves to a ready state with the fetched activities and history", async () => {
  const activities: Activity[] = [
    {
      id: 1,
      name: "Longão",
      startDate: "2026-07-15",
      distanceM: 20000,
      movingTimeS: 6000,
      averageHeartrate: 150,
      averageWatts: null,
      weightedAverageWatts: null,
      rtss: 90,
      bestEfforts: null,
      zoneMinutes: null,
    },
  ];
  const history: MetricsSnapshot[] = [{ date: "2026-07-15", ctl: 52, atl: 58, tsb: -6 }];
  fetchRecentActivities.mockResolvedValue(activities);
  fetchMetricsHistory.mockResolvedValue(history);

  const { result } = renderHook(() => useAthleteDashboardData());

  expect(result.current).toEqual({ status: "loading" });
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current).toEqual({ status: "ready", activities, history });
});

it("resolves to an error state when a fetch call rejects", async () => {
  fetchRecentActivities.mockRejectedValue(new Error("network down"));
  fetchMetricsHistory.mockResolvedValue([]);

  const { result } = renderHook(() => useAthleteDashboardData());

  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current).toEqual({ status: "error", message: "network down" });
});
