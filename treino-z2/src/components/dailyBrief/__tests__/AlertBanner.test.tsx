import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AlertBanner } from "../AlertBanner";

it("renders nothing when there are no alerts", () => {
  const { container } = render(<AlertBanner alerts={[]} />);
  expect(container).toBeEmptyDOMElement();
});

it("gives a critical alert role=alert so screen readers announce it immediately", () => {
  render(
    <AlertBanner
      alerts={[{ kind: "high_injury_risk", severity: "critical", message: "Injury risk is elevated.", evidence: ["Injury risk: high"] }]}
    />,
  );
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Injury risk is elevated.");
  expect(alert).toHaveTextContent("Injury risk: high");
});

it("gives a warning alert role=status, not role=alert", () => {
  render(
    <AlertBanner
      alerts={[{ kind: "overreaching", severity: "warning", message: "Load is climbing fast.", evidence: [] }]}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Load is climbing fast.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("omits the evidence line when there is no evidence", () => {
  render(<AlertBanner alerts={[{ kind: "overreaching", severity: "warning", message: "Load is climbing fast.", evidence: [] }]} />);
  expect(screen.queryByText("·")).not.toBeInTheDocument();
});

it("renders multiple alerts", () => {
  render(
    <AlertBanner
      alerts={[
        { kind: "high_injury_risk", severity: "critical", message: "Injury risk is elevated.", evidence: [] },
        { kind: "extreme_fatigue", severity: "warning", message: "Fatigue is very high.", evidence: [] },
      ]}
    />,
  );
  expect(screen.getByText("Injury risk is elevated.")).toBeInTheDocument();
  expect(screen.getByText("Fatigue is very high.")).toBeInTheDocument();
});
