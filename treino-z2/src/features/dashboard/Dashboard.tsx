import { useEffect, useState } from "react";
import type { Activity, MetricsSnapshot } from "../../domain/types";
import { computeWeeklySummary, latestSnapshot } from "../../domain/metricsEngine";
import { fetchMetricsHistory, fetchRecentActivities } from "../../infrastructure/activityRepository";
import { KpiRow } from "./KpiRow";
import { ActivityTable } from "./ActivityTable";
import { FitnessTrendChart } from "./FitnessTrendChart";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; activities: Activity[]; history: MetricsSnapshot[] };

function currentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const nextMonday = new Date(monday.getTime() + 7 * 86400000);
  return { start: monday.toISOString().slice(0, 10), end: nextMonday.toISOString().slice(0, 10) };
}

export function Dashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecentActivities(), fetchMetricsHistory()])
      .then(([activities, history]) => {
        if (!cancelled) setState({ status: "ready", activities, history });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
