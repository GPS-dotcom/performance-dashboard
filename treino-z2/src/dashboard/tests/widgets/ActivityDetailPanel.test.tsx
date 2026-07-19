import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityDetailPanel } from "../../widgets/ActivityDetailPanel";
import type { Activity } from "../../../types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    name: "Morning Run",
    startDate: "2026-07-18T08:00:00Z",
    distanceM: 10000,
    movingTimeS: 3000,
    averageHeartrate: 150,
    averageWatts: 220,
    weightedAverageWatts: 230,
    rtss: 85,
    bestEfforts: { "5k": 1200 },
    zoneMinutes: { Z1: 5, Z2: 30, Z3: 10, Z4: 3, Z5: 1 },
    ...overrides,
  };
}

describe("ActivityDetailPanel", () => {
  it("renders the activity name as the card title and its core stats", () => {
    render(<ActivityDetailPanel activity={makeActivity()} />);
    expect(screen.getByRole("heading", { name: "Morning Run" })).toBeInTheDocument();
    expect(screen.getByText("10.00km")).toBeInTheDocument();
    expect(screen.getByText("150bpm")).toBeInTheDocument();
    expect(screen.getByText("220W")).toBeInTheDocument();
    expect(screen.getByText("230W")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders best efforts and zone minutes when present", () => {
    render(<ActivityDetailPanel activity={makeActivity()} />);
    expect(screen.getByText(/5k:/)).toBeInTheDocument();
    expect(screen.getByText(/Z1: 5min/)).toBeInTheDocument();
  });

  it("renders empty states when best efforts and zone minutes are absent", () => {
    render(<ActivityDetailPanel activity={makeActivity({ bestEfforts: null, zoneMinutes: null })} />);
    expect(screen.getByText("No best efforts recorded for this activity.")).toBeInTheDocument();
    expect(screen.getByText("No zone data recorded for this activity.")).toBeInTheDocument();
  });

  it("renders '–' placeholders for missing optional fields", () => {
    render(
      <ActivityDetailPanel
        activity={makeActivity({ distanceM: null, averageHeartrate: null, averageWatts: null, weightedAverageWatts: null, rtss: null })}
      />,
    );
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
  });
});
