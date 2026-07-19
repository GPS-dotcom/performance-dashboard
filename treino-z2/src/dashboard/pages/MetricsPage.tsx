import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../components/KpiCard";
import { TrendCard } from "../components/TrendCard";
import { useMetricsPage } from "../hooks/useMetricsPage";
import type { ZoneTable } from "../../metrics";
import type { ZoneKey } from "../../types";

const ZONE_KEYS: ZoneKey[] = ["Z1", "Z2", "Z3", "Z4", "Z5"];

function ZoneTableView({ title, table }: { title: string; table: ZoneTable | null }) {
  return (
    <Card title={title}>
      {table ? (
        <ul className="dash-plain-list">
          {table.bands.map((band) => (
            <li key={band.zone}>
              Z{band.zone} {band.name}: {band.lowerBound}
              {band.upperBound != null ? `–${band.upperBound}` : "+"} {table.unit}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="Set a threshold value in Settings to see this zone table." />
      )}
    </Card>
  );
}

/**
 * Metrics page: CTL/ATL/TSB, this week's load, time-in-zone totals and
 * Power/Pace zone tables -- every number either read straight from
 * `daily_pmc` (CTL/ATL/TSB) or produced by a Metrics Engine calculator
 * (analyzeWeeklyLoad, calculatePowerZones, calculatePaceZones). No metric
 * is computed in this file itself.
 */
export function MetricsPage() {
  const { state, retry } = useMetricsPage();

  if (state.status === "loading") return <LoadingState message="Loading metrics…" />;
  if (state.status === "error") return <ErrorState title="Could not load metrics." message={state.message} onRetry={retry} />;

  const { dates, ctlValues, atlValues, tsbValues, latest, thisWeek, zoneMinutesTotals, powerZones, paceZones } = state.data;

  return (
    <div className="dashboard">
      <div className="dash-kpi-grid">
        <KpiCard label="Fitness (CTL)" value={latest ? latest.ctl.toFixed(1) : "–"} />
        <KpiCard label="Fatigue (ATL)" value={latest ? latest.atl.toFixed(1) : "–"} />
        <KpiCard label="Form (TSB)" value={latest ? latest.tsb.toFixed(1) : "–"} />
        <KpiCard label="This Week" value={`${thisWeek.activityCount}`} unit=" sessions" helpText={`${thisWeek.distanceKm.toFixed(1)}km`} />
      </div>

      <TrendCard
        title="Training Load"
        labels={dates}
        ariaLabel="CTL, ATL and TSB over time"
        series={[
          { key: "ctl", label: "Fitness (CTL)", color: "var(--color-primary)", values: ctlValues },
          { key: "atl", label: "Fatigue (ATL)", color: "var(--color-danger)", values: atlValues },
          { key: "tsb", label: "Form (TSB)", color: "var(--color-warning)", values: tsbValues },
        ]}
      />

      <Card title="Time in Zone (all recorded activities)">
        {ZONE_KEYS.every((z) => zoneMinutesTotals[z] === 0) ? (
          <EmptyState message="No zone data recorded yet." />
        ) : (
          <ul className="dash-plain-list">
            {ZONE_KEYS.map((zone) => (
              <li key={zone}>
                {zone}: {zoneMinutesTotals[zone].toFixed(0)}min
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ZoneTableView title="Power Zones (from FTP)" table={powerZones} />
      <ZoneTableView title="Pace Zones (from threshold pace)" table={paceZones} />
    </div>
  );
}
