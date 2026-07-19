import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FitnessSection } from "../FitnessSection";

it("shows an empty-state sentence when there is no fitness score yet", () => {
  render(<FitnessSection score={null} label="unknown" trendExplanation={null} />);
  expect(screen.getByText("Not enough training history yet to estimate fitness.")).toBeInTheDocument();
});

it("shows the score and label when available", () => {
  render(<FitnessSection score={62} label="good" trendExplanation={null} />);
  expect(screen.getByText("Fitness is good (62%).")).toBeInTheDocument();
});

it("shows the trend explanation when provided", () => {
  render(<FitnessSection score={62} label="good" trendExplanation="Fitness (CTL) is improving (2.00 per week)." />);
  expect(screen.getByText("Fitness (CTL) is improving (2.00 per week).")).toBeInTheDocument();
});

it("omits the trend explanation when null", () => {
  render(<FitnessSection score={62} label="good" trendExplanation={null} />);
  expect(screen.queryByText(/improving/)).not.toBeInTheDocument();
});
