import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Recommendation } from "../../../coach";
import { RecommendationSection } from "../RecommendationSection";

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "recommendation:long_run:2026-07-18",
    type: "intensity",
    priority: 3,
    title: "Long Run",
    description: "Builds aerobic endurance.",
    reasoning: "Recovery is good enough to sustain a longer aerobic effort.",
    supportingMetrics: ["recovery_score"],
    supportingInsights: [],
    supportingPredictions: [],
    confidence: 0.68,
    createdAt: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

it("shows the title, reasoning, description and confidence", () => {
  render(<RecommendationSection recommendation={makeRecommendation()} />);
  expect(screen.getByText("Long Run")).toBeInTheDocument();
  expect(screen.getByText(/Recovery is good enough/)).toBeInTheDocument();
  expect(screen.getByText("recovery_score")).toBeInTheDocument();
  expect(screen.getByText("Builds aerobic endurance.")).toBeInTheDocument();
  expect(screen.getByText("68% confidence")).toBeInTheDocument();
});

it("omits the evidence list when there are no supporting metrics", () => {
  render(<RecommendationSection recommendation={makeRecommendation({ supportingMetrics: [] })} />);
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
