import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Alert } from "../../../coach";
import { AlertBanner } from "../AlertBanner";

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert:test:2026-07-18",
    severity: "warning",
    category: "elevated_fatigue",
    title: "Test Alert",
    description: "A test alert description.",
    actionRequired: null,
    generatedAt: "2026-07-18",
    ...overrides,
  };
}

it("renders nothing when there are no alerts", () => {
  const { container } = render(<AlertBanner alerts={[]} />);
  expect(container).toBeEmptyDOMElement();
});

it("gives a critical alert role=alert so screen readers announce it immediately", () => {
  render(
    <AlertBanner
      alerts={[makeAlert({ id: "alert:high_injury_risk:2026-07-18", severity: "critical", category: "injury_risk", title: "High Injury Risk", description: "Injury risk is elevated." })]}
    />,
  );
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("High Injury Risk");
  expect(alert).toHaveTextContent("Injury risk is elevated.");
});

it("gives a warning alert role=status, not role=alert", () => {
  render(<AlertBanner alerts={[makeAlert({ id: "alert:overreaching:2026-07-18", category: "overtraining_risk", title: "Overreaching", description: "Load is climbing fast." })]} />);
  expect(screen.getByRole("status")).toHaveTextContent("Load is climbing fast.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows actionRequired when present", () => {
  render(
    <AlertBanner
      alerts={[makeAlert({ id: "alert:overreaching:2026-07-18", title: "Overreaching", description: "Load is climbing fast.", actionRequired: "Reduce load significantly." })]}
    />,
  );
  expect(screen.getByText("Reduce load significantly.")).toBeInTheDocument();
});

it("renders multiple alerts", () => {
  render(
    <AlertBanner
      alerts={[
        makeAlert({ id: "alert:high_injury_risk:2026-07-18", severity: "critical", category: "injury_risk", title: "High Injury Risk", description: "Injury risk is elevated." }),
        makeAlert({ id: "alert:extreme_fatigue:2026-07-18", category: "elevated_fatigue", title: "Extreme Fatigue", description: "Fatigue is very high." }),
      ]}
    />,
  );
  expect(screen.getByText("Injury risk is elevated.")).toBeInTheDocument();
  expect(screen.getByText("Fatigue is very high.")).toBeInTheDocument();
});
