import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Prediction, RaceModelValue } from "../../../prediction";
import { PredictionsSection } from "../PredictionsSection";

function makePrediction(overrides: Partial<Prediction<RaceModelValue>> = {}): Prediction<RaceModelValue> {
  return {
    id: "prediction:race_fiveK:2026-07-18",
    predictionType: "race_time_5k",
    category: "race",
    value: null,
    confidence: 0,
    lowerBound: null,
    upperBound: null,
    supportingMetrics: ["best_effort"],
    supportingInsights: [],
    assumptions: [],
    generatedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

it("shows an empty-state message when no prediction has a value", () => {
  render(<PredictionsSection racePredictions={[{ label: "5K", result: makePrediction({ assumptions: ["no best efforts available"] }) }]} />);
  expect(screen.getByText(/No best efforts synced yet/)).toBeInTheDocument();
});

it("shows the predicted time and method for an available prediction", () => {
  render(
    <PredictionsSection
      racePredictions={[
        {
          label: "Marathon",
          result: makePrediction({
            value: { predictedTimeSec: 11040, method: "riegel_extrapolation", anchorDistanceKm: 10, anchorTimeSec: 2400 },
            confidence: 0.44,
            lowerBound: 6624,
            upperBound: 15456,
          }),
        },
      ]}
    />,
  );
  expect(screen.getByText("3:04:00")).toBeInTheDocument();
  expect(screen.getByText("44% confidence")).toBeInTheDocument();
  expect(screen.getByText(/estimated from 10km/)).toBeInTheDocument();
});
