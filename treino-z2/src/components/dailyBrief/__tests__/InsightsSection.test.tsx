import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { InsightsSection } from "../InsightsSection";

it("shows an empty-state message when there are no insights", () => {
  render(<InsightsSection insights={[]} />);
  expect(screen.getByText("Not enough history yet to detect trends, plateaus or evolution.")).toBeInTheDocument();
});

it("lists each insight's explanation and confidence", () => {
  render(
    <InsightsSection
      insights={[
        {
          kind: "trend",
          metricName: "Fitness (CTL)",
          severity: "info",
          confidence: 0.9,
          explanation: "Fitness (CTL) is improving (2.00 per week) over the last 20 data points.",
          sourceMetrics: {},
          recommendation: null,
        },
        {
          kind: "plateau",
          metricName: "LT1 pace",
          severity: "warning",
          confidence: 0.72,
          explanation: "LT1 pace has plateaued over the last 6 weeks.",
          sourceMetrics: {},
          recommendation: null,
        },
      ]}
    />,
  );
  expect(screen.getByText(/Fitness \(CTL\) is improving/)).toBeInTheDocument();
  expect(screen.getByText("90% confidence")).toBeInTheDocument();
  expect(screen.getByText(/LT1 pace has plateaued/)).toBeInTheDocument();
  expect(screen.getByText("72% confidence")).toBeInTheDocument();
});
