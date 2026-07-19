import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationCard } from "../../components/RecommendationCard";
import type { Recommendation } from "../../../coach";

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "r1",
    type: "intensity",
    priority: 1,
    title: "Easy Run",
    description: "Keep today's session easy.",
    reasoning: "Fatigue is elevated relative to fitness.",
    supportingMetrics: ["tsb"],
    supportingInsights: [],
    supportingPredictions: [],
    confidence: 0.75,
    createdAt: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("renders title, description, reasoning and confidence", () => {
    render(
      <ul>
        <RecommendationCard recommendation={makeRecommendation()} />
      </ul>,
    );
    expect(screen.getByText("Easy Run")).toBeInTheDocument();
    expect(screen.getByText("Keep today's session easy.")).toBeInTheDocument();
    expect(screen.getByText("Fatigue is elevated relative to fitness.")).toBeInTheDocument();
    expect(screen.getByText("75% confidence")).toBeInTheDocument();
  });

  it.each([
    [1, "Urgent"],
    [2, "High"],
    [3, "Medium"],
    [4, "Low"],
    [5, "Optional"],
  ] as const)("shows priority %d as %s", (priority, label) => {
    render(
      <ul>
        <RecommendationCard recommendation={makeRecommendation({ priority })} />
      </ul>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
