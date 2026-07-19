import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";

const mockState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockState(), retry }),
}));

const { usePredictionsPage } = await import("../../hooks/usePredictionsPage");

describe("usePredictionsPage", () => {
  it("passes through the loading state unchanged", () => {
    mockState.mockReturnValue({ status: "loading" });
    const { result } = renderHook(() => usePredictionsPage());
    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("passes through the error state unchanged", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    const { result } = renderHook(() => usePredictionsPage());
    expect(result.current.state).toEqual({ status: "error", message: "boom" });
  });

  it("assembles a predictions view model once athlete data is ready", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" },
    });
    const { result } = renderHook(() => usePredictionsPage());
    expect(result.current.state.status).toBe("ready");
    if (result.current.state.status === "ready") {
      expect(result.current.state.data.racePredictions).toHaveLength(4);
    }
  });
});
