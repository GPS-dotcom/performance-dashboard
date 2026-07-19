import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { LaboratoryViewModel } from "../../hooks/useLaboratoryPage";

const mockState = vi.fn<() => LoadState<LaboratoryViewModel>>();
const retry = vi.fn();
const selectTest = vi.fn();

vi.mock("../../hooks/useLaboratoryPage", () => ({
  useLaboratoryPage: () => ({ state: mockState(), retry, selectTest }),
}));

const { LaboratoryPage } = await import("../../pages/LaboratoryPage");

describe("LaboratoryPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<LaboratoryPage />);
    expect(screen.getByText("Loading laboratory…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<LaboratoryPage />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows an empty state when there are no lactate tests", () => {
    mockState.mockReturnValue({ status: "ready", data: { tests: [], selectedTestId: null, thresholds: null, thresholdsLoading: false } });
    render(<LaboratoryPage />);
    expect(screen.getByText("No lactate tests recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("Select a test above to compute its LT1/LT2.")).toBeInTheDocument();
    expect(screen.getByText(/FTP Test, Critical Power Test/)).toBeInTheDocument();
  });

  it("lists tests and calls selectTest when one is clicked", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: { tests: [{ id: "t1", testDate: "2026-07-01", testType: "power", notes: "Ramp test" }], selectedTestId: null, thresholds: null, thresholdsLoading: false },
    });
    render(<LaboratoryPage />);
    const button = screen.getByText(/2026-07-01 — power test: Ramp test/);
    fireEvent.click(button);
    expect(selectTest).toHaveBeenCalledWith("t1");
  });

  it("shows a loading indicator while computing thresholds", () => {
    mockState.mockReturnValue({ status: "ready", data: { tests: [], selectedTestId: "t1", thresholds: null, thresholdsLoading: true } });
    render(<LaboratoryPage />);
    expect(screen.getByText("Computing thresholds…")).toBeInTheDocument();
  });

  it("renders LT1/LT2 once computed", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: {
        tests: [],
        selectedTestId: "t1",
        thresholds: {
          lt1: { value: { intensity: 3.2, intensityUnit: "speed_mps", heartRate: 150 }, confidence: 0.8, dataQuality: "high", requiredInputs: [], missingInputs: [] },
          lt2: { value: { intensity: 4.1, intensityUnit: "speed_mps", heartRate: 172 }, confidence: 0.8, dataQuality: "high", requiredInputs: [], missingInputs: [] },
        },
        thresholdsLoading: false,
      },
    });
    render(<LaboratoryPage />);
    expect(screen.getByText(/LT1: 3.20 speed_mps \(150bpm\)/)).toBeInTheDocument();
    expect(screen.getByText(/LT2: 4.10 speed_mps \(172bpm\)/)).toBeInTheDocument();
  });
});
