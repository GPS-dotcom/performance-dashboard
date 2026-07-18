import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PredictionsSection } from "../PredictionsSection";

it("shows an empty-state message when no prediction has a value", () => {
  render(
    <PredictionsSection
      racePredictions={[
        { label: "5K", result: { value: null, confidence: 0, dataQuality: "low", requiredInputs: [], missingInputs: ["no best efforts available"] } },
      ]}
    />,
  );
  expect(screen.getByText(/No best efforts synced yet/)).toBeInTheDocument();
});

it("shows the predicted time and method for an available prediction", () => {
  render(
    <PredictionsSection
      racePredictions={[
        {
          label: "Marathon",
          result: {
            value: { targetDistanceKm: 42.195, predictedTimeSec: 11040, method: "riegel_extrapolation", anchorDistanceKm: 10, anchorTimeSec: 2400 },
            confidence: 0.44,
            dataQuality: "low",
            requiredInputs: [],
            missingInputs: [],
          },
        },
      ]}
    />,
  );
  expect(screen.getByText("3:04:00")).toBeInTheDocument();
  expect(screen.getByText("44% confidence")).toBeInTheDocument();
  expect(screen.getByText(/estimated from 10km/)).toBeInTheDocument();
});
