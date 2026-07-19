import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { PredictionsViewModel } from "../../hooks/assemblePredictionsView";
import type { Prediction, RaceModelValue } from "../../../prediction";

const mockState = vi.fn<() => LoadState<PredictionsViewModel>>();
const retry = vi.fn();

vi.mock("../../hooks/usePredictionsPage", () => ({
  usePredictionsPage: () => ({ state: mockState(), retry }),
}));

const { PredictionsPage } = await import("../../pages/PredictionsPage");

function unavailableRace(): Prediction<RaceModelValue> {
  return {
    id: "p1",
    predictionType: "race_time_5k",
    category: "race",
    value: null,
    confidence: 0,
    lowerBound: null,
    upperBound: null,
    supportingMetrics: [],
    supportingInsights: [],
    assumptions: [],
    generatedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-25T00:00:00.000Z",
  };
}

function baseData(overrides: Partial<PredictionsViewModel> = {}): PredictionsViewModel {
  return {
    racePredictions: [
      { label: "5K", result: unavailableRace() },
      { label: "10K", result: unavailableRace() },
      { label: "Half Marathon", result: unavailableRace() },
      { label: "Marathon", result: unavailableRace() },
    ],
    fitnessEvolution: null,
    recoveryTime: null,
    injuryRisk: null,
    ...overrides,
  };
}

describe("PredictionsPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<PredictionsPage />);
    expect(screen.getByText("Loading predictions…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<PredictionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows empty states for every section when nothing is available", () => {
    mockState.mockReturnValue({ status: "ready", data: baseData() });
    render(<PredictionsPage />);
    expect(screen.getByText(/No best efforts synced yet/)).toBeInTheDocument();
    expect(screen.getByText("Not enough fitness history yet to project a trend.")).toBeInTheDocument();
    expect(screen.getAllByText("Not enough training load data yet.")).toHaveLength(2);
    expect(screen.getByText(/Goal probability needs a numeric target value/)).toBeInTheDocument();
  });

  it("renders a race prediction, fitness evolution, recovery time and injury risk when present", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: baseData({
        racePredictions: [
          { label: "5K", result: { ...unavailableRace(), value: { predictedTimeSec: 1200, method: "actual_best_effort", anchorDistanceKm: null, anchorTimeSec: null }, confidence: 0.9 } },
        ],
        fitnessEvolution: { ...unavailableRace(), value: { projectedDate: "2026-08-18", projectedValue: 55, slopePerDay: 0.2, rSquared: 0.8 }, confidence: 0.7 } as never,
        recoveryTime: { ...unavailableRace(), value: { daysUntilRecovered: 1.5, assumedDailyTss: 0 } } as never,
        injuryRisk: { ...unavailableRace(), value: { riskScore: 40, riskLevel: "moderate", acwr: 1.2 }, confidence: 0.6 } as never,
      }),
    });
    render(<PredictionsPage />);
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText(/55.0/)).toBeInTheDocument();
    expect(screen.getByText(/1.5 days/)).toBeInTheDocument();
    expect(screen.getByText(/moderate/)).toBeInTheDocument();
  });
});
