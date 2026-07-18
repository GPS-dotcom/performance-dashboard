import { computeWeeklySummary, latestSnapshot } from "../../engines/metrics/metricsEngine";
import { useAthleteDashboardData } from "../../hooks/useAthleteDashboardData";
import { currentWeekRange } from "../../utils/date";
import { KpiRow } from "./KpiRow";
import { ActivityTable } from "./ActivityTable";
import { FitnessTrendChart } from "./FitnessTrendChart";

export function Dashboard() {
  const state = useAthleteDashboardData();

  if (state.status === "loading") {
    return <p className="empty-note">Loading athlete data…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="error-box">
        <strong>Could not load data from Supabase.</strong>
        <p>{state.message}</p>
      </div>
    );
  }

  const { activities, history } = state;
  const snapshot = latestSnapshot(history);
  const { start, end } = currentWeekRange();
  const week = computeWeeklySummary(activities, start, end);

  const kpis = [
    { label: "Fitness (CTL)", value: snapshot ? Math.round(snapshot.ctl).toString() : "–" },
    { label: "Fatigue (ATL)", value: snapshot ? Math.round(snapshot.atl).toString() : "–" },
    { label: "Form (TSB)", value: snapshot ? Math.round(snapshot.tsb).toString() : "–" },
    { label: "This week", value: week.distanceKm.toFixed(1), unit: "km" },
  ];

  return (
    <div className="dashboard">
      <KpiRow kpis={kpis} />

      <section className="card">
        <h2>Fitness trend</h2>
        <FitnessTrendChart history={history} />
      </section>

      <section className="card">
        <h2>Recent activities</h2>
        <ActivityTable activities={activities} />
      </section>
    </div>
  );
}
