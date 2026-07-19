import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { MetricsViewModel } from "../../hooks/assembleMetricsView";

const mockState = vi.fn<() => LoadState<MetricsViewModel>>();
const retry = vi.fn();

vi.mock("../../hooks/useMetricsPage", () => ({
  useMetricsPage: () => ({ state: mockState(), retry }),
}));

const { MetricsPage } = await import("../../pages/MetricsPage");

function baseData(overrides: Partial<MetricsViewModel> = {}): MetricsViewModel {
  return {
    dates: [],
    ctlValues: [],
    atlValues: [],
    tsbValues: [],
    latest: null,
    thisWeek: { activityCount: 0, distanceKm: 0, movingTimeS: 0, totalExternalRtss: 0 },
    zoneMinutesTotals: { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 },
    powerZones: null,
    paceZones: null,
    ...overrides,
  };
}

describe("MetricsPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<MetricsPage />);
    expect(screen.getByText("Loading metrics…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<MetricsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("renders '–' KPIs and zone/zone-table empty states with no data", () => {
    mockState.mockReturnValue({ status: "ready", data: baseData() });
    render(<MetricsPage />);
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
    expect(screen.getByText("No zone data recorded yet.")).toBeInTheDocument();
    expect(screen.getAllByText("Set a threshold value in Settings to see this zone table.")).toHaveLength(2);
  });

  it("renders KPIs and zone totals when data is present", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: baseData({
        dates: ["2026-07-18", "2026-07-19"],
        ctlValues: [48, 50],
        atlValues: [40, 42],
        tsbValues: [8, 8],
        latest: { date: "2026-07-19", ctl: 50, atl: 42, tsb: 8 },
        thisWeek: { activityCount: 3, distanceKm: 25.4, movingTimeS: 9000, totalExternalRtss: 240 },
        zoneMinutesTotals: { Z1: 10, Z2: 20, Z3: 0, Z4: 0, Z5: 0 },
      }),
    });
    render(<MetricsPage />);
    expect(screen.getByText("50.0")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Z2: 20min/)).toBeInTheDocument();
  });
});
