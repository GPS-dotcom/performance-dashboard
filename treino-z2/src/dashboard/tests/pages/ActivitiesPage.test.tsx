import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";
import type { Activity } from "../../../types";

const mockState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockState(), retry }),
}));

const { ActivitiesPage } = await import("../../pages/ActivitiesPage");

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Morning Run",
    startDate: "2026-07-18T08:00:00Z",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: null,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

describe("ActivitiesPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<ActivitiesPage />);
    expect(screen.getByText("Loading activities…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<ActivitiesPage />);
    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows an empty state when there are no activities", () => {
    mockState.mockReturnValue({ status: "ready", data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" } });
    render(<ActivitiesPage />);
    expect(screen.getByText("No activities match these filters.")).toBeInTheDocument();
  });

  it("lists activities and filters them by search", () => {
    const activities = [makeActivity({ id: "a1", name: "Morning Run" }), makeActivity({ id: "a2", name: "Bike Ride" })];
    mockState.mockReturnValue({ status: "ready", data: { activities, metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" } });
    render(<ActivitiesPage />);
    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.getByText("Bike Ride")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search activities by name…"), { target: { value: "bike" } });
    expect(screen.queryByText("Morning Run")).not.toBeInTheDocument();
    expect(screen.getByText("Bike Ride")).toBeInTheDocument();
  });

  it("shows the activity detail panel once a row is selected", () => {
    const activities = [makeActivity({ id: "a1", name: "Morning Run" })];
    mockState.mockReturnValue({ status: "ready", data: { activities, metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" } });
    render(<ActivitiesPage />);
    fireEvent.click(screen.getByText("Morning Run"));
    expect(screen.getByRole("heading", { name: "Morning Run" })).toBeInTheDocument();
  });

  it("filters by date range", () => {
    const activities = [makeActivity({ id: "recent", startDate: "2026-07-18T08:00:00Z" }), makeActivity({ id: "old", name: "Old Run", startDate: "2025-01-01T08:00:00Z" })];
    mockState.mockReturnValue({ status: "ready", data: { activities, metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" } });
    render(<ActivitiesPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "30" } });
    expect(screen.queryByText("Old Run")).not.toBeInTheDocument();
  });
});
