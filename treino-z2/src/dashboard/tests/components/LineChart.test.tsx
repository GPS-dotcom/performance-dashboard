import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChart } from "../../components/LineChart";

describe("LineChart", () => {
  it("renders an empty state with fewer than 2 labels", () => {
    render(<LineChart labels={["2026-07-18"]} series={[{ key: "ctl", label: "CTL", color: "red", values: [50] }]} ariaLabel="Fitness" />);
    expect(screen.getByText("Not enough history yet to draw a trend.")).toBeInTheDocument();
  });

  it("renders an empty state when every series value is null", () => {
    render(
      <LineChart
        labels={["2026-07-17", "2026-07-18"]}
        series={[{ key: "ctl", label: "CTL", color: "red", values: [null, null] }]}
        ariaLabel="Fitness"
      />,
    );
    expect(screen.getByText("Not enough history yet to draw a trend.")).toBeInTheDocument();
  });

  it("uses a custom empty message when given", () => {
    render(<LineChart labels={[]} series={[]} ariaLabel="Fitness" emptyMessage="Custom empty message" />);
    expect(screen.getByText("Custom empty message")).toBeInTheDocument();
  });

  it("renders an svg with a legend entry per series when there's enough data", () => {
    render(
      <LineChart
        labels={["2026-07-17", "2026-07-18", "2026-07-19"]}
        series={[
          { key: "ctl", label: "Fitness (CTL)", color: "var(--color-primary)", values: [48, 49, 50] },
          { key: "atl", label: "Fatigue (ATL)", color: "var(--color-danger)", values: [55, 53, null] },
        ]}
        ariaLabel="Training load over time"
      />,
    );
    expect(screen.getByRole("img", { name: "Training load over time" })).toBeInTheDocument();
    expect(screen.getByText("Fitness (CTL)")).toBeInTheDocument();
    expect(screen.getByText("Fatigue (ATL)")).toBeInTheDocument();
  });

  it("skips drawing a path for a series with fewer than 2 non-null points", () => {
    const { container } = render(
      <LineChart
        labels={["2026-07-17", "2026-07-18", "2026-07-19"]}
        series={[
          { key: "ctl", label: "Fitness (CTL)", color: "var(--color-primary)", values: [48, 49, 50] },
          { key: "sparse", label: "Sparse", color: "blue", values: [null, null, 10] },
        ]}
        ariaLabel="Chart"
      />,
    );
    expect(container.querySelectorAll("path[stroke]")).toHaveLength(1);
  });
});
