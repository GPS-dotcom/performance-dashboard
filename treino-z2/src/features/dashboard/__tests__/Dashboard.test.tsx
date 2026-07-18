import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Activity, MetricsSnapshot } from "../../../domain/types";

const fetchRecentActivities = vi.fn<() => Promise<Activity[]>>();
const fetchMetricsHistory = vi.fn<() => Promise<MetricsSnapshot[]>>();

vi.mock("../../../infrastructure/activityRepository", () => ({
  fetchRecentActivities: () => fetchRecentActivities(),
  fetchMetricsHistory: () => fetchMetricsHistory(),
}));

// Imported after the mock so Dashboard picks up the mocked repository.
const { Dashboard } = await import("../Dashboard");

afterEach(() => {
  vi.resetAllMocks();
});

it("renders KPI values and recent activities once data loads", async () => {
  fetchRecentActivities.mockResolvedValue([
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
  ]);
  fetchMetricsHistory.mockResolvedValue([
    { date: "2026-07-14", ctl: 50, atl: 55, tsb: -5 },
    { date: "2026-07-15", ctl: 52, atl: 58, tsb: -6 },
  ]);

  render(<Dashboard />);

  expect(await screen.findByText("Longão")).toBeInTheDocument();
  expect(screen.getByText("52")).toBeInTheDocument(); // Fitness (CTL)
  expect(screen.getByText("58")).toBeInTheDocument(); // Fatigue (ATL)
  expect(screen.getByText("-6")).toBeInTheDocument(); // Form (TSB)
});

it("shows an error message when the repository call fails", async () => {
  fetchRecentActivities.mockRejectedValue(new Error("network down"));
  fetchMetricsHistory.mockResolvedValue([]);

  render(<Dashboard />);

  expect(await screen.findByText("network down")).toBeInTheDocument();
});
