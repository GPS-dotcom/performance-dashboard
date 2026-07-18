import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { LoadState } from "../../../hooks/useAthleteDashboardData";

const useAthleteDashboardData = vi.fn<() => LoadState>();

vi.mock("../../../hooks/useAthleteDashboardData", () => ({
  useAthleteDashboardData: () => useAthleteDashboardData(),
}));

// Imported after the mock so Dashboard picks up the mocked hook.
const { Dashboard } = await import("../Dashboard");

afterEach(() => {
  vi.resetAllMocks();
});

it("renders KPI values and recent activities once data loads", () => {
  useAthleteDashboardData.mockReturnValue({
    status: "ready",
    activities: [
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
    ],
    history: [
      { date: "2026-07-14", ctl: 50, atl: 55, tsb: -5 },
      { date: "2026-07-15", ctl: 52, atl: 58, tsb: -6 },
    ],
  });

  render(<Dashboard />);

  expect(screen.getByText("Longão")).toBeInTheDocument();
  expect(screen.getByText("52")).toBeInTheDocument(); // Fitness (CTL)
  expect(screen.getByText("58")).toBeInTheDocument(); // Fatigue (ATL)
  expect(screen.getByText("-6")).toBeInTheDocument(); // Form (TSB)
});

it("shows an error message when the hook reports an error", () => {
  useAthleteDashboardData.mockReturnValue({ status: "error", message: "network down" });

  render(<Dashboard />);

  expect(screen.getByText("network down")).toBeInTheDocument();
});

it("shows a loading message while data is loading", () => {
  useAthleteDashboardData.mockReturnValue({ status: "loading" });

  render(<Dashboard />);

  expect(screen.getByText("Loading athlete data…")).toBeInTheDocument();
});
