import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityListItem } from "../../widgets/ActivityListItem";
import type { Activity } from "../../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Morning Run",
    startDate: "2026-07-18T08:00:00Z",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: null,
    averageWatts: null,
    weightedAverageWatts: null,
    rtss: null,
    bestEfforts: null,
    zoneMinutes: null,
    ...overrides,
  };
}

describe("ActivityListItem", () => {
  it("renders the date, name, distance and duration", () => {
    render(<ActivityListItem activity={makeActivity()} selected={false} onSelect={() => {}} />);
    expect(screen.getByText("2026-07-18")).toBeInTheDocument();
    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.getByText("10.0km")).toBeInTheDocument();
    expect(screen.getByText("50:00")).toBeInTheDocument();
  });

  it("renders '–' when distance is null", () => {
    render(<ActivityListItem activity={makeActivity({ distanceM: null })} selected={false} onSelect={() => {}} />);
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("calls onSelect with the activity when clicked", () => {
    const onSelect = vi.fn();
    const activity = makeActivity();
    render(<ActivityListItem activity={activity} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(activity);
  });

  it("applies a selected class when selected is true", () => {
    render(<ActivityListItem activity={makeActivity()} selected={true} onSelect={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("dash-activity-row-selected");
  });
});
