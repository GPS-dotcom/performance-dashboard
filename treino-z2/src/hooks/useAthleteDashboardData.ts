import { useEffect, useState } from "react";
import type { Activity, MetricsSnapshot } from "../types";
import { fetchMetricsHistory, fetchRecentActivities } from "../services/activityService";

export type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; activities: Activity[]; history: MetricsSnapshot[] };

/** Loads the current athlete's activities and fitness history from the Metrics/Activity services. */
export function useAthleteDashboardData(): LoadState {
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

  return state;
}
