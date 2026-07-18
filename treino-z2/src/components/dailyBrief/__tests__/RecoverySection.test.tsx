import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { RecoverySection } from "../RecoverySection";

it("shows an empty-state sentence when there is no recovery score yet", () => {
  render(<RecoverySection score={null} label="unknown" recoveryTime={null} recommendations={[]} />);
  expect(screen.getByText("Not enough training history yet to estimate recovery.")).toBeInTheDocument();
});

it("shows the score, label and a 'fully recovered' sentence when 0 days remain", () => {
  render(
    <RecoverySection
      score={80}
      label="excellent"
      recoveryTime={{ value: { daysUntilRecovered: 0, assumedRestTss: 0 }, confidence: 0.8, dataQuality: "high", requiredInputs: [], missingInputs: [] }}
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
      recoveryTime={{ value: { daysUntilRecovered: 4, assumedRestTss: 0 }, confidence: 0.65, dataQuality: "medium", requiredInputs: [], missingInputs: [] }}
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
      recommendations={[
        { recommendation: "Recovery Day", reason: "Recovery is critically low.", evidence: [], confidence: 0.8, expectedOutcome: "x", alternative: null },
      ]}
    />,
  );
  expect(screen.getByText("Recovery Day")).toBeInTheDocument();
});
