import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DailyBriefLoadState, UseDailyBriefResult } from "../../../hooks/useDailyBrief";

const useDailyBrief = vi.fn<() => UseDailyBriefResult>();
const retry = vi.fn();

vi.mock("../../../hooks/useDailyBrief", () => ({
  useDailyBrief: () => useDailyBrief(),
}));

function withState(state: DailyBriefLoadState): UseDailyBriefResult {
  return { state, retry };
}

const { DailyBriefPage } = await import("../DailyBriefPage");

afterEach(() => {
  vi.resetAllMocks();
});

function readyState(overrides: Partial<DailyBriefLoadState & { status: "ready" }> = {}): DailyBriefLoadState {
  return {
    status: "ready",
    viewModel: {
      brief: {
        date: "2026-07-18",
        status: "Recovery is good, fitness is good. Today's recommendation: Long Run.",
        recovery: { score: 75, label: "good" },
        fitness: { score: 60, label: "good" },
        trainingRecommendation: {
          recommendation: "Long Run",
          reason: "Recovery is good enough to sustain a longer aerobic effort.",
          evidence: ["Recovery Score 75%"],
          confidence: 0.68,
          expectedOutcome: "Builds aerobic endurance.",
          alternative: "If fatigue rises, shorten it.",
        },
        keyInsights: ["Fitness (CTL) is improving (2.00 per week) over the last 20 data points."],
        raceCountdown: { raceName: "Chicago Marathon", daysUntil: 85 },
        warnings: [],
        opportunities: [],
        confidenceLevel: 0.68,
      },
      insights: [
        {
          kind: "trend",
          metricName: "Fitness (CTL)",
          severity: "info",
          confidence: 0.9,
          explanation: "Fitness (CTL) is improving (2.00 per week) over the last 20 data points.",
          sourceMetrics: {},
          recommendation: null,
        },
      ],
      racePredictions: [
        {
          label: "5K",
          result: {
            value: { targetDistanceKm: 5, predictedTimeSec: 1200, method: "actual_best_effort", anchorDistanceKm: 5, anchorTimeSec: 1200 },
            confidence: 0.95,
            dataQuality: "high",
            requiredInputs: [],
            missingInputs: [],
          },
        },
      ],
      recoveryTime: {
        value: { daysUntilRecovered: 0, assumedRestTss: 0 },
        confidence: 0.8,
        dataQuality: "high",
        requiredInputs: [],
        missingInputs: [],
      },
      recoveryRecommendations: [],
      trainingLoadHistory: [
        { date: "2026-07-17", ctl: 50, atl: 45, tsb: 5 },
        { date: "2026-07-18", ctl: 51, atl: 46, tsb: 5 },
      ],
      timelineEvents: [{ date: "2026-07-17", title: "Easy Run", description: "8.0 km", kind: "activity" }],
    },
    ...overrides,
  } as DailyBriefLoadState;
}

it("shows a loading message while the brief is loading", () => {
  useDailyBrief.mockReturnValue(withState({ status: "loading" }));
  render(<DailyBriefPage />);
  expect(screen.getByText(/Preparing today's brief/)).toBeInTheDocument();
});

it("shows an error message when the brief fails to load", () => {
  useDailyBrief.mockReturnValue(withState({ status: "error", message: "network down" }));
  render(<DailyBriefPage />);
  expect(screen.getByText("network down")).toBeInTheDocument();
});

it("renders every section in the required order: Recovery, Fitness, Today's Recommendation, Insights, Predictions, Upcoming Races, Training Load, Timeline", () => {
  useDailyBrief.mockReturnValue(withState(readyState()));
  render(<DailyBriefPage />);

  const labels = screen.getAllByText(
    /^(Recovery|Fitness|Today's Recommendation|Insights|Predictions|Upcoming Races|Training Load|Timeline)$/,
  );
  expect(labels.map((el) => el.textContent)).toEqual([
    "Recovery",
    "Fitness",
    "Today's Recommendation",
    "Insights",
    "Predictions",
    "Upcoming Races",
    "Training Load",
    "Timeline",
  ]);
});

it("surfaces real content in each section, not just numbers", () => {
  useDailyBrief.mockReturnValue(withState(readyState()));
  render(<DailyBriefPage />);

  expect(screen.getByText("Recovery is good (75%).")).toBeInTheDocument();
  expect(screen.getByText(/Long Run/)).toBeInTheDocument();
  expect(screen.getByText(/85/)).toBeInTheDocument();
  expect(screen.getByText(/Chicago Marathon/)).toBeInTheDocument();
});

it("shows the alert banner above the sections when a warning is active", () => {
  const state = readyState();
  if (state.status === "ready") {
    state.viewModel.brief.warnings = [
      { kind: "high_injury_risk", severity: "critical", message: "Injury risk is elevated.", evidence: ["Injury risk: high"] },
    ];
  }
  useDailyBrief.mockReturnValue(withState(state));
  render(<DailyBriefPage />);
  expect(screen.getByText("Injury risk is elevated.")).toBeInTheDocument();
});

it("renders no alert banner when there are no warnings", () => {
  useDailyBrief.mockReturnValue(withState(readyState()));
  render(<DailyBriefPage />);
  expect(screen.queryByText(/Injury risk/)).not.toBeInTheDocument();
});
