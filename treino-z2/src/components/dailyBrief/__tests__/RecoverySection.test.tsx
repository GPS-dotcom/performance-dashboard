import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Prediction, RecoveryModelValue } from "../../../prediction";
import type { Recommendation } from "../../../coach";
import { RecoverySection } from "../RecoverySection";

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "recommendation:recovery_day:2026-07-18",
    type: "recovery",
    priority: 1,
    title: "Recovery Day",
    description: "Take a full recovery day.",
    reasoning: "Recovery is critically low.",
    supportingMetrics: ["recovery_score"],
    supportingInsights: [],
    supportingPredictions: [],
    confidence: 0.8,
    createdAt: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

function makeRecoveryPrediction(overrides: Partial<Prediction<RecoveryModelValue>> = {}): Prediction<RecoveryModelValue> {
  return {
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
    ...overrides,
  };
}

it("shows an empty-state sentence when there is no recovery score yet", () => {
  render(<RecoverySection score={null} label="unknown" recoveryTime={null} recommendations={[]} />);
  expect(screen.getByText("Not enough training history yet to estimate recovery.")).toBeInTheDocument();
});

it("shows the score, label and a 'fully recovered' sentence when 0 days remain", () => {
  render(
    <RecoverySection
      score={80}
      label="excellent"
      recoveryTime={makeRecoveryPrediction({ value: { daysUntilRecovered: 0, assumedDailyTss: 0 }, confidence: 0.8 })}
      recommendations={[]}
    />,
  );
  expect(screen.getByText("Recovery is excellent (80%).")).toBeInTheDocument();
  expect(screen.getByText(/fully recovered/)).toBeInTheDocument();
});

it("shows a pluralized day count when recovery time is more than one day", () => {
  render(
    <RecoverySection
      score={30}
      label="low"
      recoveryTime={makeRecoveryPrediction({ value: { daysUntilRecovered: 4, assumedDailyTss: 0 }, confidence: 0.65 })}
      recommendations={[]}
    />,
  );
  expect(screen.getByText(/Estimated 4 days of rest/)).toBeInTheDocument();
});

it("lists recovery recommendations when present", () => {
  render(
    <RecoverySection
      score={30}
      label="low"
      recoveryTime={null}
      recommendations={[makeRecommendation()]}
    />,
  );
  expect(screen.getByText("Recovery Day")).toBeInTheDocument();
});
