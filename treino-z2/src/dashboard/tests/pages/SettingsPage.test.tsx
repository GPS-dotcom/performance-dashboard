import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";
import type { AthleteProfile } from "../../services/athleteProfileService";

const mockState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockState(), retry }),
}));

const { SettingsPage } = await import("../../pages/SettingsPage");
const { ThemeProvider } = await import("../../providers/ThemeProvider");

function makeAthlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    id: "a1",
    birthday: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    ftp: 250,
    vo2max: null,
    maxHr: 190,
    restingHr: null,
    thresholdPaceSecPerKm: 240,
    thresholdPower: null,
    preferredUnits: "metric",
    ...overrides,
  };
}

function renderSettings() {
  return render(
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>,
  );
}

describe("SettingsPage", () => {
  it("renders a theme selector that changes the document's data-theme attribute", () => {
    mockState.mockReturnValue({ status: "loading" });
    renderSettings();
    fireEvent.change(screen.getByLabelText("Theme preference"), { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("shows a loading state for the profile section", () => {
    mockState.mockReturnValue({ status: "loading" });
    renderSettings();
    expect(screen.getByText("Loading profile…")).toBeInTheDocument();
  });

  it("shows an error state with retry for the profile section", () => {
    mockState.mockReturnValue({ status: "error", message: "boom" });
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows an empty state when no athlete profile exists", () => {
    mockState.mockReturnValue({ status: "ready", data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: null, today: "2026-07-19" } });
    renderSettings();
    expect(screen.getByText("No athlete profile found yet.")).toBeInTheDocument();
  });

  it("renders profile fields when an athlete profile exists", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: makeAthlete(), today: "2026-07-19" },
    });
    renderSettings();
    expect(screen.getByText("FTP: 250W")).toBeInTheDocument();
    expect(screen.getByText("Max HR: 190bpm")).toBeInTheDocument();
    expect(screen.getByText("Weight: not set")).toBeInTheDocument();
  });

  it("renders a static integrations list and a sync empty state", () => {
    mockState.mockReturnValue({ status: "loading" });
    renderSettings();
    expect(screen.getByText(/Strava/)).toBeInTheDocument();
    expect(screen.getByText(/Live sync status isn't tracked yet/)).toBeInTheDocument();
  });
});
