import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TrainingLoadSection } from "../TrainingLoadSection";

it("shows an empty-state sentence when there is no history", () => {
  render(<TrainingLoadSection history={[]} />);
  expect(screen.getByText("Not enough training history yet to assess load balance.")).toBeInTheDocument();
});

it("warns about accumulating fatigue when TSB is well below zero", () => {
  render(<TrainingLoadSection history={[{ date: "2026-07-18", ctl: 50, atl: 75, tsb: -25 }]} />);
  expect(screen.getByText(/well ahead of recovery/)).toBeInTheDocument();
  expect(screen.getByText(/fatigue is accumulating/)).toBeInTheDocument();
});

it("describes a normal build phase when TSB is slightly negative", () => {
  render(<TrainingLoadSection history={[{ date: "2026-07-18", ctl: 50, atl: 55, tsb: -10 }]} />);
  expect(screen.getByText(/slightly ahead of recovery/)).toBeInTheDocument();
});

it("describes a well-balanced load when TSB is a small positive number", () => {
  render(<TrainingLoadSection history={[{ date: "2026-07-18", ctl: 50, atl: 45, tsb: 5 }]} />);
  expect(screen.getByText(/well balanced with recovery/)).toBeInTheDocument();
});

it("describes a good window for harder training when TSB is high", () => {
  render(<TrainingLoadSection history={[{ date: "2026-07-18", ctl: 50, atl: 30, tsb: 20 }]} />);
  expect(screen.getByText(/good window for harder training/)).toBeInTheDocument();
});

it("uses the most recent point in history to describe balance", () => {
  render(
    <TrainingLoadSection
      history={[
        { date: "2026-07-17", ctl: 50, atl: 75, tsb: -25 },
        { date: "2026-07-18", ctl: 50, atl: 30, tsb: 20 },
      ]}
    />,
  );
  expect(screen.getByText(/good window for harder training/)).toBeInTheDocument();
});
