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
        summary: "Recovery is good, fitness is good. Today's decision: maintain load (Long Run).",
        keyChanges: ["Recovery Score increased."],
        attentionPoints: [],
        recentEvolution: ["Recovery is good.", "Fitness is good.", "Fitness (CTL) is improving (2.00 per week) over the last 20 data points."],
        trainingDecision: {
          id: "decision:maintain_load:2026-07-18",
          action: "maintain_load",
          reasoning: "Recovery is good enough to sustain the current training load without adding or removing volume.",
          supportingMetrics: ["recovery_score"],
          confidence: 0.68,
          strategyUsed: "good_recovery_maintain",
          generatedAt: "2026-07-18",
        },
        recommendations: [
          {
            id: "recommendation:long_run:2026-07-18",
            type: "intensity",
            priority: 3,
            title: "Long Run",
            description: "Builds aerobic endurance while recovery capacity allows it.",
            reasoning: "Recovery is good enough to sustain a longer aerobic effort.",
            supportingMetrics: ["recovery_score"],
            supportingInsights: [],
            supportingPredictions: [],
            confidence: 0.68,
            createdAt: "2026-07-18T00:00:00.000Z",
          },
        ],
        alerts: [],
        raceCountdown: { raceName: "Chicago Marathon", daysUntil: 85 },
        confidenceLevel: 0.68,
      },
      recovery: { score: 75, label: "good" },
      fitness: { score: 60, label: "good" },
      insights: [
        {
          id: "insight:trend_ctl_improving:2026-07-18",
          category: "fitness",
          priority: 6,
          title: "Fitness is improving",
          description: "Fitness (CTL) is improving (2.00 per week) over the last 20 data points.",
          evidence: ["20 data points from 2026-06-29 to 2026-07-18", "slope 2.000 per week (R² 0.98)"],
          confidence: 0.9,
          confidenceLevel: "very_high",
          relatedMetrics: ["ctl"],
          date: "2026-07-18",
          severity: "information",
          relatedRecommendations: [],
        },
      ],
      racePredictions: [
        {
          label: "5K",
          result: {
            id: "prediction:race_fiveK:2026-07-18",
            predictionType: "race_time_5k",
            category: "race",
            value: { predictedTimeSec: 1200, method: "actual_best_effort", anchorDistanceKm: 5, anchorTimeSec: 1200 },
            confidence: 0.95,
            lowerBound: 1140,
            upperBound: 1260,
            supportingMetrics: ["best_effort"],
            supportingInsights: [],
            assumptions: [],
            generatedAt: "2026-07-18T00:00:00.000Z",
            expiresAt: "2026-08-17T00:00:00.000Z",
          },
        },
      ],
      recoveryTime: {
        id: "prediction:recovery_time:2026-07-18",
        predictionType: "recovery_time",
        category: "recovery",
        value: { daysUntilRecovered: 0, assumedDailyTss: 0 },
        confidence: 0.8,
        lowerBound: 0,
        upperBound: 0,
        supportingMetrics: ["ctl", "atl"],
        supportingInsights: [],
        assumptions: [],
        generatedAt: "2026-07-18T00:00:00.000Z",
        expiresAt: "2026-07-19T00:00:00.000Z",
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

it("shows the alert banner above the sections when an alert is active", () => {
  const state = readyState();
  if (state.status === "ready") {
    state.viewModel.brief.alerts = [
      {
        id: "alert:high_injury_risk:2026-07-18",
        severity: "critical",
        category: "injury_risk",
        title: "High Injury Risk",
        description: "Injury risk is elevated.",
        actionRequired: "Reduce load or take a rest day.",
        generatedAt: "2026-07-18",
      },
    ];
  }
  useDailyBrief.mockReturnValue(withState(state));
  render(<DailyBriefPage />);
  expect(screen.getByText("Injury risk is elevated.")).toBeInTheDocument();
});

it("renders no alert banner when there are no alerts", () => {
  useDailyBrief.mockReturnValue(withState(readyState()));
  render(<DailyBriefPage />);
  expect(screen.queryByText(/Injury risk/)).not.toBeInTheDocument();
});
