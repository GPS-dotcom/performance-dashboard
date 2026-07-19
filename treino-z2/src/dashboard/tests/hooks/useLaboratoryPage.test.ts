import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";

const mockAthleteState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();
const fetchLactateTests = vi.fn();
const computeLactateThresholds = vi.fn();

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockAthleteState(), retry }),
}));
vi.mock("../../services/laboratoryService", () => ({
  fetchLactateTests: (athleteId: string) => fetchLactateTests(athleteId),
}));
vi.mock("../../../metrics", () => ({
  computeLactateThresholds: (testId: string) => computeLactateThresholds(testId),
}));

const { useLaboratoryPage } = await import("../../hooks/useLaboratoryPage");

const today = "2026-07-19";

afterEach(() => {
  fetchLactateTests.mockReset();
  computeLactateThresholds.mockReset();
});

describe("useLaboratoryPage", () => {
  it("passes through the loading state unchanged", () => {
    mockAthleteState.mockReturnValue({ status: "loading" });
    const { result } = renderHook(() => useLaboratoryPage());
    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("passes through the error state unchanged", () => {
    mockAthleteState.mockReturnValue({ status: "error", message: "boom" });
    const { result } = renderHook(() => useLaboratoryPage());
    expect(result.current.state).toEqual({ status: "error", message: "boom" });
  });

  it("returns an empty ready state without querying lactate tests when there's no athlete profile", () => {
    mockAthleteState.mockReturnValue({ status: "ready", data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: null, today } });
    const { result } = renderHook(() => useLaboratoryPage());
    expect(result.current.state).toEqual({ status: "ready", data: { tests: [], selectedTestId: null, thresholds: null, thresholdsLoading: false } });
    expect(fetchLactateTests).not.toHaveBeenCalled();
  });

  it("stays loading until the lactate test list resolves, once an athlete id is known", async () => {
    fetchLactateTests.mockReturnValue(new Promise(() => {}));
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { result } = renderHook(() => useLaboratoryPage());
    expect(result.current.state.status).toBe("loading");
    expect(fetchLactateTests).toHaveBeenCalledWith("athlete-1");
  });

  it("ignores a late test-list resolution after unmount", async () => {
    let resolveTests: (value: []) => void = () => {};
    fetchLactateTests.mockReturnValue(new Promise((resolve) => (resolveTests = resolve)));
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { unmount } = renderHook(() => useLaboratoryPage());
    unmount();
    resolveTests([]);
    await Promise.resolve();
  });

  it("lists tests once fetched, then computes thresholds for a selected test", async () => {
    fetchLactateTests.mockResolvedValue([{ id: "test-1", testDate: "2026-07-01", testType: "pace", notes: null }]);
    computeLactateThresholds.mockResolvedValue({ lt1: { value: null }, lt2: { value: null } });
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { result } = renderHook(() => useLaboratoryPage());

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.data.tests).toHaveLength(1);
    });

    act(() => result.current.selectTest("test-1"));
    expect(computeLactateThresholds).toHaveBeenCalledWith("test-1");

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.data.thresholdsLoading).toBe(false);
      expect(result.current.state.data.thresholds).toEqual({ lt1: { value: null }, lt2: { value: null } });
    });
  });

  it("clears the loading flag even when computing thresholds fails", async () => {
    fetchLactateTests.mockResolvedValue([{ id: "test-1", testDate: "2026-07-01", testType: "pace", notes: null }]);
    computeLactateThresholds.mockRejectedValue(new Error("boom"));
    mockAthleteState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: { id: "athlete-1" } as AthleteData["athlete"], today },
    });
    const { result } = renderHook(() => useLaboratoryPage());

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.data.tests).toHaveLength(1);
    });

    act(() => result.current.selectTest("test-1"));

    await waitFor(() => {
      if (result.current.state.status !== "ready") throw new Error("expected ready");
      expect(result.current.state.data.thresholdsLoading).toBe(false);
      expect(result.current.state.data.thresholds).toBeNull();
    });
  });
});
