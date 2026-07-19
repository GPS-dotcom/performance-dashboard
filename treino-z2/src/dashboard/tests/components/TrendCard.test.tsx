import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendCard } from "../../components/TrendCard";

describe("TrendCard", () => {
  it("renders the title and delegates to LineChart", () => {
    render(
      <TrendCard
        title="Training Load"
        labels={["2026-07-17", "2026-07-18"]}
        series={[{ key: "ctl", label: "CTL", color: "red", values: [48, 49] }]}
        ariaLabel="Training load"
      />,
    );
    expect(screen.getByRole("heading", { name: "Training Load" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Training load" })).toBeInTheDocument();
  });

  it("forwards a custom empty message to LineChart", () => {
    render(<TrendCard title="Training Load" labels={[]} series={[]} ariaLabel="Training load" emptyMessage="No data" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
