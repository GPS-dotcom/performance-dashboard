import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Activity, MetricsSnapshot } from "../../types";
import type { UpcomingGoal } from "../../services/goalService";

const fetchRecentActivities = vi.fn<() => Promise<Activity[]>>();
const fetchMetricsHistory = vi.fn<() => Promise<MetricsSnapshot[]>>();
const fetchUpcomingGoal = vi.fn<() => Promise<UpcomingGoal | null>>();

vi.mock("../../services/activityService", () => ({
  fetchRecentActivities: () => fetchRecentActivities(),
  fetchMetricsHistory: () => fetchMetricsHistory(),
}));
vi.mock("../../services/goalService", () => ({
  fetchUpcomingGoal: () => fetchUpcomingGoal(),
}));

const { useDailyBrief } = await import("../useDailyBrief");

afterEach(() => {
  vi.resetAllMocks();
});

it("assembles a ready Daily Brief once all three fetches resolve", async () => {
  fetchRecentActivities.mockResolvedValue([]);
  fetchMetricsHistory.mockResolvedValue([{ date: "2026-07-18", ctl: 50, atl: 55, tsb: -5 }]);
  fetchUpcomingGoal.mockResolvedValue({ id: "g1", label: "Chicago Marathon", kind: "marathon", targetDate: "2026-10-11" });

  const { result } = renderHook(() => useDailyBrief());

  expect(result.current.state).toEqual({ status: "loading" });
  await waitFor(() => expect(result.current.state.status).toBe("ready"));
  if (result.current.state.status !== "ready") throw new Error("expected ready");
  expect(result.current.state.viewModel.brief.raceCountdown).toEqual({ raceName: "Chicago Marathon", daysUntil: 85 });
});

it("resolves to an error state when a fetch rejects", async () => {
  fetchRecentActivities.mockRejectedValue(new Error("network down"));
  fetchMetricsHistory.mockResolvedValue([]);
  fetchUpcomingGoal.mockResolvedValue(null);

  const { result } = renderHook(() => useDailyBrief());

  await waitFor(() => expect(result.current.state.status).toBe("error"));
  expect(result.current.state).toEqual({ status: "error", message: "network down" });
});

it("retry() re-runs the fetch and can recover from an error", async () => {
  fetchRecentActivities.mockRejectedValueOnce(new Error("network down"));
  fetchMetricsHistory.mockResolvedValue([]);
  fetchUpcomingGoal.mockResolvedValue(null);

  const { result } = renderHook(() => useDailyBrief());
  await waitFor(() => expect(result.current.state.status).toBe("error"));

  fetchRecentActivities.mockResolvedValueOnce([]);
  act(() => result.current.retry());

  expect(result.current.state).toEqual({ status: "loading" });
  await waitFor(() => expect(result.current.state.status).toBe("ready"));
  expect(fetchRecentActivities).toHaveBeenCalledTimes(2);
});

it("stringifies a non-Error rejection instead of crashing", async () => {
  fetchRecentActivities.mockRejectedValue("string rejection, not an Error");
  fetchMetricsHistory.mockResolvedValue([]);
  fetchUpcomingGoal.mockResolvedValue(null);

  const { result } = renderHook(() => useDailyBrief());

  await waitFor(() => expect(result.current.state.status).toBe("error"));
  expect(result.current.state).toEqual({ status: "error", message: "string rejection, not an Error" });
});

it("does not update state after the component unmounts mid-fetch", async () => {
  let resolveActivities!: (activities: Activity[]) => void;
  fetchRecentActivities.mockReturnValue(new Promise((resolve) => (resolveActivities = resolve)));
  fetchMetricsHistory.mockResolvedValue([]);
  fetchUpcomingGoal.mockResolvedValue(null);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const { result, unmount } = renderHook(() => useDailyBrief());
  expect(result.current.state).toEqual({ status: "loading" });

  unmount();
  await act(async () => {
    resolveActivities([]);
    await Promise.resolve();
  });

  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

it("does not update state after the component unmounts mid-fetch, even when the fetch then rejects", async () => {
  let rejectActivities!: (err: unknown) => void;
  fetchRecentActivities.mockReturnValue(new Promise((_resolve, reject) => (rejectActivities = reject)));
  fetchMetricsHistory.mockResolvedValue([]);
  fetchUpcomingGoal.mockResolvedValue(null);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const { result, unmount } = renderHook(() => useDailyBrief());
  expect(result.current.state).toEqual({ status: "loading" });

  unmount();
  await act(async () => {
    rejectActivities(new Error("network down"));
    await Promise.resolve();
  });

  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});
