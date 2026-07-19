import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertCard } from "../../components/AlertCard";
import type { Alert } from "../../../coach";

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "a1",
    severity: "warning",
    category: "elevated_fatigue",
    title: "Elevated fatigue",
    description: "TSB has been below -20 for 3 days.",
    actionRequired: "Prioritize an easy day.",
    generatedAt: "2026-07-18",
    ...overrides,
  };
}

describe("AlertCard", () => {
  it("renders title, description and action", () => {
    render(<AlertCard alert={makeAlert()} />);
    expect(screen.getByText("Elevated fatigue")).toBeInTheDocument();
    expect(screen.getByText("TSB has been below -20 for 3 days.")).toBeInTheDocument();
    expect(screen.getByText("Prioritize an easy day.")).toBeInTheDocument();
  });

  it("renders no action text when actionRequired is null", () => {
    render(<AlertCard alert={makeAlert({ actionRequired: null })} />);
    expect(screen.queryByText("Prioritize an easy day.")).not.toBeInTheDocument();
  });

  it("uses role=alert for critical severity and role=status otherwise", () => {
    const { rerender } = render(<AlertCard alert={makeAlert({ severity: "critical" })} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<AlertCard alert={makeAlert({ severity: "info" })} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
