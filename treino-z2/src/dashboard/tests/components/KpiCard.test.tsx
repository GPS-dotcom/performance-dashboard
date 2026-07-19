import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "../../components/KpiCard";

describe("KpiCard", () => {
  it("renders the label and value", () => {
    render(<KpiCard label="Fitness (CTL)" value="52.3" />);
    expect(screen.getByText("Fitness (CTL)")).toBeInTheDocument();
    expect(screen.getByText("52.3")).toBeInTheDocument();
  });

  it("renders a unit when given", () => {
    render(<KpiCard label="Sessions" value="4" unit=" sessions" />);
    expect(screen.getByText((_, el) => el?.className === "dash-kpi-unit")).toHaveTextContent("sessions");
  });

  it("renders help text when given", () => {
    render(<KpiCard label="This Week" value="4" helpText="32.1km" />);
    expect(screen.getByText("32.1km")).toBeInTheDocument();
  });

  it.each(["increasing", "decreasing", "stable"] as const)("renders a %s trend arrow with an accessible label", (trend) => {
    render(<KpiCard label="Fitness" value="50" trend={trend} />);
    expect(screen.getByLabelText(`Trend: ${trend}`)).toBeInTheDocument();
  });

  it("renders no trend arrow when trend is omitted", () => {
    render(<KpiCard label="Fitness" value="50" />);
    expect(screen.queryByLabelText(/^Trend:/)).not.toBeInTheDocument();
  });
});
