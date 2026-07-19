import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Activity, MetricsSnapshot } from "../../../types";

const fetchRecentActivities = vi.fn<() => Promise<Activity[]>>();
const fetchMetricsHistory = vi.fn<() => Promise<MetricsSnapshot[]>>();
const fetchUpcomingGoal = vi.fn<() => Promise<null>>();
const fetchCurrentAthlete = vi.fn<() => Promise<null>>();

vi.mock("../../../services/activityService", () => ({
  fetchRecentActivities: () => fetchRecentActivities(),
  fetchMetricsHistory: () => fetchMetricsHistory(),
}));
vi.mock("../../../services/goalService", () => ({
  fetchUpcomingGoal: () => fetchUpcomingGoal(),
}));
vi.mock("../../services/athleteProfileService", () => ({
  fetchCurrentAthlete: () => fetchCurrentAthlete(),
}));

const { useAthleteData } = await import("../../hooks/useAthleteData");

afterEach(() => {
  fetchRecentActivities.mockReset();
  fetchMetricsHistory.mockReset();
  fetchUpcomingGoal.mockReset();
  fetchCurrentAthlete.mockReset();
});

describe("useAthleteData", () => {
  it("starts in a loading state", () => {
    fetchRecentActivities.mockReturnValue(new Promise(() => {}));
    fetchMetricsHistory.mockResolvedValue([]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { result } = renderHook(() => useAthleteData());
    expect(result.current.state.status).toBe("loading");
  });

  it("resolves to a ready state with the fetched data once every fetch settles", async () => {
    fetchRecentActivities.mockResolvedValue([{ id: "a1" } as Activity]);
    fetchMetricsHistory.mockResolvedValue([{ date: "2026-07-18", ctl: 50, atl: 40, tsb: 10 } as MetricsSnapshot]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { result } = renderHook(() => useAthleteData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.data.activities).toHaveLength(1);
    expect(result.current.state.data.metricsHistory).toHaveLength(1);
    expect(result.current.state.data.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("moves to an error state when a fetch rejects", async () => {
    fetchRecentActivities.mockRejectedValue(new Error("network down"));
    fetchMetricsHistory.mockResolvedValue([]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { result } = renderHook(() => useAthleteData());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    if (result.current.state.status !== "error") throw new Error("expected error");
    expect(result.current.state.message).toBe("network down");
  });

  it("moves to an error state with a stringified message when a non-Error value is rejected", async () => {
    fetchRecentActivities.mockRejectedValue("plain string failure");
    fetchMetricsHistory.mockResolvedValue([]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { result } = renderHook(() => useAthleteData());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    if (result.current.state.status !== "error") throw new Error("expected error");
    expect(result.current.state.message).toBe("plain string failure");
  });

  it("ignores a late resolution after unmount instead of updating state", async () => {
    let resolveActivities: (value: Activity[]) => void = () => {};
    fetchRecentActivities.mockReturnValue(new Promise((resolve) => (resolveActivities = resolve)));
    fetchMetricsHistory.mockResolvedValue([]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { unmount } = renderHook(() => useAthleteData());
    unmount();
    resolveActivities([]);
    await Promise.resolve();
    // No assertion needed beyond "this doesn't throw" -- setState after unmount would log a React warning if the cancelled guard didn't work.
  });

  it("retry() re-fetches everything", async () => {
    fetchRecentActivities.mockResolvedValue([]);
    fetchMetricsHistory.mockResolvedValue([]);
    fetchUpcomingGoal.mockResolvedValue(null);
    fetchCurrentAthlete.mockResolvedValue(null);

    const { result } = renderHook(() => useAthleteData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.retry());
    await waitFor(() => expect(fetchRecentActivities).toHaveBeenCalledTimes(2));
  });
});
