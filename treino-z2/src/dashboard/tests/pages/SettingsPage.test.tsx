import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoadState } from "../../types";
import type { AthleteData } from "../../hooks/useAthleteData";
import type { AthleteProfile } from "../../services/athleteProfileService";
import type { InstalledPluginRecord } from "../../../platform/manager/pluginManager";

const mockState = vi.fn<() => LoadState<AthleteData>>();
const retry = vi.fn();
const listPlugins = vi.fn<() => InstalledPluginRecord[]>(() => []);

vi.mock("../../hooks/useAthleteData", () => ({
  useAthleteData: () => ({ state: mockState(), retry }),
}));
vi.mock("../../hooks/usePluginRegistryVersion", () => ({
  usePluginRegistryVersion: () => 0,
}));
vi.mock("../../../platform/manager/appPluginManager", () => ({
  appPluginManager: { list: () => listPlugins() },
}));
vi.mock("../../widgets/PluginWidgetSlot", () => ({
  PluginWidgetSlot: ({ slot }: { slot: string }) => <div data-testid={`plugin-widget-slot-${slot}`} />,
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
    thresholdHeartRate: 165,
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
    expect(screen.getByText("Threshold Heart Rate: 165bpm")).toBeInTheDocument();
  });

  it("shows 'not set' for threshold heart rate when the athlete hasn't set one", () => {
    mockState.mockReturnValue({
      status: "ready",
      data: { activities: [], metricsHistory: [], upcomingGoal: null, athlete: makeAthlete({ thresholdHeartRate: null }), today: "2026-07-19" },
    });
    renderSettings();
    expect(screen.getByText("Threshold Heart Rate: not set")).toBeInTheDocument();
  });

  it("renders a static integrations list and a sync empty state", () => {
    mockState.mockReturnValue({ status: "loading" });
    renderSettings();
    expect(screen.getByText(/Strava/)).toBeInTheDocument();
    expect(screen.getByText(/Live sync status isn't tracked yet/)).toBeInTheDocument();
  });

  it("shows an empty state when no plugins are installed", () => {
    mockState.mockReturnValue({ status: "loading" });
    listPlugins.mockReturnValue([]);
    renderSettings();
    expect(screen.getByText("No plugins installed.")).toBeInTheDocument();
  });

  it("lists installed plugins with their name, version and state", () => {
    mockState.mockReturnValue({ status: "loading" });
    listPlugins.mockReturnValue([
      {
        id: "com.example.a",
        manifest: {
          id: "com.example.a",
          name: "Example Plugin",
          version: "1.0.0",
          description: "d",
          author: { name: "Someone" },
          minHostVersion: "1.0.0",
          maxHostVersion: null,
          dependencies: {},
          extensionPoints: [],
          permissions: [],
          signature: null,
        },
        state: "enabled",
        grantedPermissions: [],
        errorMessage: null,
      },
    ]);
    renderSettings();
    expect(screen.getByText(/Example Plugin v1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText("enabled")).toBeInTheDocument();
  });

  it("renders the plugin widget slot", () => {
    mockState.mockReturnValue({ status: "loading" });
    renderSettings();
    expect(screen.getByTestId("plugin-widget-slot-settings")).toBeInTheDocument();
  });
});
