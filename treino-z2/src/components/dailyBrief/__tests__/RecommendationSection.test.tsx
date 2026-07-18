import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { RecommendationSection } from "../RecommendationSection";

it("shows the recommendation, reason, expected outcome and confidence", () => {
  render(
    <RecommendationSection
      recommendation={{
        recommendation: "Long Run",
        reason: "Recovery is good enough to sustain a longer aerobic effort.",
        evidence: ["Recovery Score 75%"],
        confidence: 0.68,
        expectedOutcome: "Builds aerobic endurance.",
        alternative: null,
      }}
    />,
  );
  expect(screen.getByText("Long Run")).toBeInTheDocument();
  expect(screen.getByText(/Recovery is good enough/)).toBeInTheDocument();
  expect(screen.getByText("Recovery Score 75%")).toBeInTheDocument();
  expect(screen.getByText("Builds aerobic endurance.")).toBeInTheDocument();
  expect(screen.getByText("68% confidence")).toBeInTheDocument();
});

it("omits the evidence list when there is no evidence", () => {
  render(
    <RecommendationSection
      recommendation={{
        recommendation: "Rest Day",
        reason: "Fatigue is elevated.",
        evidence: [],
        confidence: 0.8,
        expectedOutcome: "Restores recovery.",
        alternative: null,
      }}
    />,
  );
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("shows the alternative note when present", () => {
  render(
    <RecommendationSection
      recommendation={{
        recommendation: "Long Run",
        reason: "x",
        evidence: [],
        confidence: 0.5,
        expectedOutcome: "y",
        alternative: "If fatigue rises, shorten it.",
      }}
    />,
  );
  expect(screen.getByText("If fatigue rises, shorten it.")).toBeInTheDocument();
});

it("omits the alternative note when null", () => {
  render(
    <RecommendationSection
      recommendation={{ recommendation: "Long Run", reason: "x", evidence: [], confidence: 0.5, expectedOutcome: "y", alternative: null }}
    />,
  );
  expect(screen.queryByText(/shorten it/)).not.toBeInTheDocument();
});
