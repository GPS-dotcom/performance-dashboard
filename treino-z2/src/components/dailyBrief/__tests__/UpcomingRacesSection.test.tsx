import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UpcomingRacesSection } from "../UpcomingRacesSection";

function statementText(container: HTMLElement): string | null {
  return container.querySelector(".brief-statement")?.textContent ?? null;
}

it("shows an empty-state message and suggested action when there is no upcoming race", () => {
  render(<UpcomingRacesSection raceCountdown={null} />);
  expect(screen.getByText("No upcoming race set.")).toBeInTheDocument();
  expect(screen.getByText("Add a goal to see a countdown here.")).toBeInTheDocument();
});

it("shows the singular 'day' for a countdown of exactly 1", () => {
  const { container } = render(<UpcomingRacesSection raceCountdown={{ raceName: "Local 5K", daysUntil: 1 }} />);
  expect(statementText(container)).toBe("1 day until Local 5K.");
});

it("shows the plural 'days' for any other countdown", () => {
  const { container } = render(<UpcomingRacesSection raceCountdown={{ raceName: "Chicago Marathon", daysUntil: 85 }} />);
  expect(statementText(container)).toBe("85 days until Chicago Marathon.");
});

it("shows the plural 'days' when the countdown is 0", () => {
  const { container } = render(<UpcomingRacesSection raceCountdown={{ raceName: "Race Day", daysUntil: 0 }} />);
  expect(statementText(container)).toBe("0 days until Race Day.");
});
