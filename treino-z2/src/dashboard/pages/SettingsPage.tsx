import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAthleteData } from "../hooks/useAthleteData";
import { usePluginRegistryVersion } from "../hooks/usePluginRegistryVersion";
import { useTheme } from "../providers/themeContext";
import type { ThemePreference } from "../providers/themeContext";
import { appPluginManager } from "../../platform/manager/appPluginManager";
import { PluginWidgetSlot } from "../widgets/PluginWidgetSlot";
import { formatPace } from "../../utils/format";

/**
 * Settings page: theme preference (the only setting with a real backing
 * store today -- localStorage via ThemeProvider) plus a read-only view of
 * the athlete profile (`athletes` table) and a static integrations list.
 * There is no sign-in flow, integration-status table or sync-log table in
 * this schema yet (PROJECT_AUDIT.md), so profile editing and live sync
 * status are out of scope for this phase -- see DASHBOARD_REPORT.md's
 * Limitations.
 *
 * "Plugins" and the trailing `<PluginWidgetSlot>` are the Dashboard's
 * only two touchpoints with the Plugin Platform (see
 * PLUGIN_PLATFORM_REPORT.md) -- both read generically from `platform/`
 * SDK-level abstractions (`appPluginManager.list()`,
 * `widgetExtensionPoint.list()`), never from a specific plugin. The core
 * ships with zero plugins installed; this section is empty until a host
 * or the athlete installs one.
 */
export function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const { state, retry } = useAthleteData();
  usePluginRegistryVersion();
  const plugins = appPluginManager.list();

  return (
    <div className="dashboard">
      <Card title="Preferences">
        <label className="dash-settings-row">
          Theme
          <select value={preference} onChange={(e) => setPreference(e.target.value as ThemePreference)} aria-label="Theme preference">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </Card>

      <Card title="Profile">
        {state.status === "loading" && <LoadingState message="Loading profile…" />}
        {state.status === "error" && <ErrorState title="Could not load profile." message={state.message} onRetry={retry} />}
        {state.status === "ready" &&
          (state.data.athlete ? (
            <ul className="dash-plain-list">
              <li>FTP: {state.data.athlete.ftp != null ? `${state.data.athlete.ftp}W` : "not set"}</li>
              <li>Weight: {state.data.athlete.weightKg != null ? `${state.data.athlete.weightKg}kg` : "not set"}</li>
              <li>Max HR: {state.data.athlete.maxHr != null ? `${state.data.athlete.maxHr}bpm` : "not set"}</li>
              <li>Threshold Pace: {state.data.athlete.thresholdPaceSecPerKm != null ? formatPace(state.data.athlete.thresholdPaceSecPerKm / 60) : "not set"}</li>
              <li>Threshold Heart Rate: {state.data.athlete.thresholdHeartRate != null ? `${state.data.athlete.thresholdHeartRate}bpm` : "not set"}</li>
              <li>Units: {state.data.athlete.preferredUnits}</li>
            </ul>
          ) : (
            <EmptyState message="No athlete profile found yet." action="Editing a profile is not yet supported -- there is no sign-in flow in this app today." />
          ))}
      </Card>

      <Card title="Integrations">
        <ul className="dash-plain-list">
          <li>Strava — activities sync via a Strava sync job.</li>
        </ul>
      </Card>

      <Card title="Sync">
        <EmptyState message="Live sync status isn't tracked yet -- no sync-log table exists in the current schema." />
      </Card>

      <Card title="Plugins">
        {plugins.length === 0 ? (
          <EmptyState message="No plugins installed." action="See PLUGIN_DEVELOPER_GUIDE.md for how to build and install one." />
        ) : (
          <ul className="dash-plain-list">
            {plugins.map((p) => (
              <li key={p.id}>
                {p.manifest.name} v{p.manifest.version} <Badge variant={p.state === "enabled" ? "success" : p.state === "error" ? "danger" : "neutral"}>{p.state}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PluginWidgetSlot slot="settings" />
    </div>
  );
}
