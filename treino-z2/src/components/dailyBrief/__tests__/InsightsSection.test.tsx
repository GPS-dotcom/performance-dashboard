import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Insight } from "../../../intelligence";
import { InsightsSection } from "../InsightsSection";

function makeInsight(overrides: Partial<Insight>): Insight {
  return {
    id: "insight:test",
    category: "fitness",
    priority: 6,
    title: "Test insight",
    description: "Test insight description.",
    evidence: [],
    confidence: 0.5,
    confidenceLevel: "moderate",
    relatedMetrics: [],
    date: "2026-07-18",
    severity: "information",
    relatedRecommendations: [],
    ...overrides,
  };
}

it("shows an empty-state message when there are no insights", () => {
  render(<InsightsSection insights={[]} />);
  expect(screen.getByText("Not enough history yet to detect trends, plateaus or evolution.")).toBeInTheDocument();
});

it("lists each insight's description and confidence", () => {
  render(
    <InsightsSection
      insights={[
        makeInsight({
          id: "insight:trend_ctl_improving:2026-07-18",
          category: "fitness",
          severity: "information",
          confidence: 0.9,
          confidenceLevel: "very_high",
          description: "Fitness (CTL) is improving (2.00 per week) over the last 20 data points.",
          relatedMetrics: ["ctl"],
        }),
        makeInsight({
          id: "insight:plateau_stagnation_lt1_pace:2026-07-18",
          category: "fitness",
          severity: "warning",
          confidence: 0.72,
          confidenceLevel: "high",
          description: "LT1 pace has plateaued over the last 6 weeks.",
          relatedMetrics: ["lt1_pace"],
        }),
      ]}
    />,
  );
  expect(screen.getByText(/Fitness \(CTL\) is improving/)).toBeInTheDocument();
  expect(screen.getByText("90% confidence")).toBeInTheDocument();
  expect(screen.getByText(/LT1 pace has plateaued/)).toBeInTheDocument();
  expect(screen.getByText("72% confidence")).toBeInTheDocument();
});
