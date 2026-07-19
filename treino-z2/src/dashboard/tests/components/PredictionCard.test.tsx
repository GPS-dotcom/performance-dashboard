import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PredictionCard } from "../../components/PredictionCard";
import type { Prediction } from "../../../prediction";

function makePrediction(overrides: Partial<Prediction<{ seconds: number }>> = {}): Prediction<{ seconds: number }> {
  return {
    id: "p1",
    predictionType: "race_time_5k",
    category: "race",
    value: { seconds: 1200 },
    confidence: 0.9,
    lowerBound: null,
    upperBound: null,
    supportingMetrics: [],
    supportingInsights: [],
    assumptions: ["assumes the current fitness level holds"],
    generatedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("PredictionCard", () => {
  it("renders the formatted value, confidence and assumptions when a value is present", () => {
    render(
      <ul>
        <PredictionCard label="5K" prediction={makePrediction()} formatValue={(v) => `${v.seconds}s`} />
      </ul>,
    );
    expect(screen.getByText("5K")).toBeInTheDocument();
    expect(screen.getByText("1200s")).toBeInTheDocument();
    expect(screen.getByText("90% confidence")).toBeInTheDocument();
    expect(screen.getByText("assumes the current fitness level holds")).toBeInTheDocument();
  });

  it("renders an empty state when the prediction has no value", () => {
    render(
      <ul>
        <PredictionCard label="5K" prediction={makePrediction({ value: null })} formatValue={(v) => `${v.seconds}s`} />
      </ul>,
    );
    expect(screen.getByText("Not enough data yet.")).toBeInTheDocument();
  });

  it("omits the assumptions line when there are none", () => {
    render(
      <ul>
        <PredictionCard label="5K" prediction={makePrediction({ assumptions: [] })} formatValue={(v) => `${v.seconds}s`} />
      </ul>,
    );
    expect(screen.queryByText(/assumes/)).not.toBeInTheDocument();
  });
});
