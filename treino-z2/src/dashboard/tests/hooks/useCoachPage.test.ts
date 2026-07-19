import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";
import type { Activity, MetricsSnapshot } from "../../../types";

const mockAthleteState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();
const getRecommendationHistory = vi.fn();
const getAlertHistory = vi.fn();

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockAthleteState(), retry }),
}));
vi.mock("../../../coach", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getRecommendationHistory: (athleteId: string) => getRecommendationHistory(athleteId),
  getAlertHistory: (athleteId: string) => getAlertHistory(athleteId),
}));

const { useCoachPage } = await import("../../hooks/useCoachPage");

const today = "2026-07-19";
const activities: Activity[] = [];
const metricsHistory: MetricsSnapshot[] = [{ date: "2026-07-18", ctl: 50, atl: 40, tsb: 10 }];

afterEach(() => {
  getRecommendationHistory.mockReset();
  getAlertHistory.mockReset();
});

describe("useCoachPage", () => {
  it("passes through the loading state unchanged", () => {
    mockAthleteState.mockReturnValue({ status: "loading" });
    const { result } = renderHook(() => useCoachPage());
    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("passes through the error state unchanged", () => {
    mockAthleteState.mockReturnValue({ status: "error", message: "boom" });
    const { result } = renderHook(() => useCoachPage());
    expect(result.current.state).toEqual({ status: "error", message: "boom" });
  });

  it("assembles today's recommendations/alerts and the weekly report, without a persisted history when there's no athlete id", async () => {
    mockAthleteState.mockReturnValue({ status: "ready", data: { activities, metricsHistory, upcomingGoal: null, athlete: null, today } });
    const { result } = renderHook(() => useCoachPage());
    expect(result.current.state.status).toBe("ready");
    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(Array.isArray(result.current.state.data.recommendations)).toBe(true);
    expect(result.current.state.data.recommendationHistory).toEqual([]);
    expect(getRecommendationHistory).not.toHaveBeenCalled();
  });

  it("fetches persisted history once the athlete id resolves", async () => {
    getRecommendationHistory.mockResolvedValue([{ id: "r1" }]);
    getAlertHistory.mockResolvedValue([{ id: "a1" }]);
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities, metricsHistory, upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { result } = renderHook(() => useCoachPage());

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.data.recommendationHistory).toEqual([{ id: "r1" }]);
    });
    expect(getRecommendationHistory).toHaveBeenCalledWith("athlete-1");
    expect(getAlertHistory).toHaveBeenCalledWith("athlete-1");
  });

  it("ignores a late history resolution after unmount", async () => {
    let resolveHistory: (value: []) => void = () => {};
    getRecommendationHistory.mockReturnValue(new Promise((resolve) => (resolveHistory = resolve)));
    getAlertHistory.mockResolvedValue([]);
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities, metricsHistory, upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { unmount } = renderHook(() => useCoachPage());
    unmount();
    resolveHistory([]);
    await Promise.resolve();
  });

  it("keeps today's priorities working even if the history fetch rejects", async () => {
    getRecommendationHistory.mockRejectedValue(new Error("network down"));
    getAlertHistory.mockResolvedValue([]);
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities, metricsHistory, upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { result } = renderHook(() => useCoachPage());

    await waitFor(() => expect(getRecommendationHistory).toHaveBeenCalled());
    expect(result.current.state.status).toBe("ready");
  });
});
