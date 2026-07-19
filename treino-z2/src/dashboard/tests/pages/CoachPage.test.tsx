import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { CoachViewModel } from "../../hooks/useCoachPage";
import type { Recommendation, WeeklyCoachReport } from "../../../coach";

const mockState = vi.fn<() => LoadState<CoachViewModel>>();
const retry = vi.fn();

vi.mock("../../hooks/useCoachPage", () => ({
  useCoachPage: () => ({ state: mockState(), retry }),
}));

const { CoachPage } = await import("../../pages/CoachPage");

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "r1",
    type: "intensity",
    priority: 3,
    title: "Easy Run",
    description: "d",
    reasoning: "r",
    supportingMetrics: [],
    supportingInsights: [],
    supportingPredictions: [],
    confidence: 0.7,
    createdAt: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

function baseData(overrides: Partial<CoachViewModel> = {}): CoachViewModel {
  return { recommendations: [], alerts: [], weeklyReport: null, recommendationHistory: [], alertHistory: [], ...overrides };
}

describe("CoachPage", () => {
  it("shows a loading state", () => {
    mockState.mockReturnValue({ status: "loading" });
    render(<CoachPage />);
    expect(screen.getByText("Loading coach…")).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    render(<CoachPage />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows empty states when there are no priorities, weekly report or history", () => {
    mockState.mockReturnValue({ status: "ready", data: baseData() });
    render(<CoachPage />);
    expect(screen.getByText("No recommendations right now.")).toBeInTheDocument();
    expect(screen.getByText("No activity recorded this week yet.")).toBeInTheDocument();
    expect(screen.getByText(/No persisted recommendation\/alert history yet/)).toBeInTheDocument();
  });

  it("sorts recommendations by priority (1 = most urgent first)", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: baseData({ recommendations: [makeRecommendation({ id: "low", priority: 5, title: "Low priority" }), makeRecommendation({ id: "high", priority: 1, title: "High priority" })] }),
    });
    render(<CoachPage />);
    const titles = screen.getAllByText(/priority$/).map((el) => el.textContent);
    expect(titles).toEqual(["High priority", "Low priority"]);
  });

  it("renders the weekly report sections when present", () => {
    const weeklyReport: WeeklyCoachReport = {
      weekStart: "2026-07-13",
      weekEnd: "2026-07-19",
      summary: "Solid week overall.",
      evolution: ["Completed 3 sessions."],
      strengths: ["Great consistency."],
      weaknesses: ["Fatigue crept up."],
      recommendations: [],
      nextWeekPriorities: ["Add an easy day."],
      generatedAt: "2026-07-19T00:00:00.000Z",
    };
    mockState.mockReturnValue({ status: "ready", data: baseData({ weeklyReport }) });
    render(<CoachPage />);
    expect(screen.getByText("Solid week overall.")).toBeInTheDocument();
    expect(screen.getByText("Great consistency.")).toBeInTheDocument();
    expect(screen.getByText("Fatigue crept up.")).toBeInTheDocument();
    expect(screen.getByText("Add an easy day.")).toBeInTheDocument();
  });

  it("renders persisted history when present", () => {
    mockState.mockReturnValue({ status: "ready", data: baseData({ recommendationHistory: [makeRecommendation({ id: "hist" })] }) });
    render(<CoachPage />);
    expect(screen.getByText("Easy Run")).toBeInTheDocument();
  });
});
