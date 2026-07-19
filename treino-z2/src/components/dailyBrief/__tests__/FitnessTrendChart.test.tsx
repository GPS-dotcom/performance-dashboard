import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FitnessTrendChart } from "../FitnessTrendChart";

it("shows an empty-state message when there are fewer than 2 points", () => {
  render(<FitnessTrendChart history={[{ date: "2026-07-18", ctl: 50, atl: 45, tsb: 5 }]} />);
  expect(screen.getByText("Not enough history yet to draw a trend.")).toBeInTheDocument();
});

it("shows an empty-state message when history is empty", () => {
  render(<FitnessTrendChart history={[]} />);
  expect(screen.getByText("Not enough history yet to draw a trend.")).toBeInTheDocument();
});

it("draws an SVG with one path per series and a legend when there are enough points", () => {
  render(
    <FitnessTrendChart
      history={[
        { date: "2026-07-16", ctl: 50, atl: 45, tsb: 5 },
        { date: "2026-07-17", ctl: 51, atl: 46, tsb: 5 },
        { date: "2026-07-18", ctl: 52, atl: 47, tsb: 5 },
      ]}
    />,
  );
  const svg = screen.getByRole("img", { name: "Fitness trend" });
  expect(svg.querySelectorAll("path")).toHaveLength(3);
  expect(screen.getByText("Fitness (CTL)")).toBeInTheDocument();
  expect(screen.getByText("Fatigue (ATL)")).toBeInTheDocument();
  expect(screen.getByText("Form (TSB)")).toBeInTheDocument();
});

it("handles a flat series (min === max) without dividing by zero", () => {
  render(
    <FitnessTrendChart
      history={[
        { date: "2026-07-17", ctl: 0, atl: 0, tsb: 0 },
        { date: "2026-07-18", ctl: 0, atl: 0, tsb: 0 },
      ]}
    />,
  );
  const svg = screen.getByRole("img", { name: "Fitness trend" });
  expect(svg.querySelectorAll("path")).toHaveLength(3);
});
