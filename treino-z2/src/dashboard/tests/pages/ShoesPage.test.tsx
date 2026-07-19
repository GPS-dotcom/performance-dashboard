import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { ShoesViewModel } from "../../hooks/assembleShoesView";
import type { Insight } from "../../../intelligence";

const mockState = vi.fn<() => LoadState<ShoesViewModel>>();
const retry = vi.fn();

vi.mock("../../hooks/useShoesPage", () => ({
  useShoesPage: () => ({ state: mockState(), retry }),
}));

const { ShoesPage } = await import("../../pages/ShoesPage");

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "i1",
    category: "equipment",
    priority: 8,
    title: "Shoe wear",
    description: "Your Pegasus is approaching its replacement mileage.",
    evidence: [],
    confidence: 0.8,
    confidenceLevel: "high",
    relatedMetrics: [],
    date: "2026-07-19",
    severity: "warning",
    relatedRecommendations: [],
    ...overrides,
  };
}

describe("ShoesPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<ShoesPage />);
    expect(screen.getByText("Loading shoes…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<ShoesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows the no-gear-data empty state when hasGearData is false", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: { usageSummaries: [], wearInsights: [], performanceDifference: null, newPersonalBests: [], hasGearData: false },
    });
    render(<ShoesPage />);
    expect(screen.getByText("Shoe/gear tracking isn't recorded in the current schema yet.")).toBeInTheDocument();
  });

  it("renders usage, wear insights and personal bests when gear data exists", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: {
        usageSummaries: [{ shoe: "Pegasus 40", activityCount: 12, totalDistanceKm: 320, averagePaceSecPerKm: 300, averagePowerWatts: null }],
        wearInsights: [makeInsight()],
        performanceDifference: makeInsight({ id: "diff" }),
        newPersonalBests: [makeInsight({ id: "pr", severity: "positive" })],
        hasGearData: true,
      },
    });
    render(<ShoesPage />);
    expect(screen.getByText(/Pegasus 40/)).toBeInTheDocument();
    expect(screen.getAllByText("Your Pegasus is approaching its replacement mileage.").length).toBeGreaterThan(0);
  });
});
