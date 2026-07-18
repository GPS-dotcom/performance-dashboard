import { useEffect, useState } from "react";
import { fetchMetricsHistory, fetchRecentActivities } from "../services/activityService";
import { fetchUpcomingGoal } from "../services/goalService";
import { assembleDailyBrief } from "./assembleDailyBrief";
import type { DailyBriefViewModel } from "./assembleDailyBrief";

export type DailyBriefLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; viewModel: DailyBriefViewModel };

/**
 * Loads the athlete's activities, fitness history and upcoming goal, then
 * assembles the full Daily Brief view model (assembleDailyBrief) from
 * them. The Daily Brief replaces the old KPI-grid Dashboard as the home
 * screen -- per docs/ARCHITECTURE.md's DEC-0004, "the home screen becomes
 * a Daily Brief instead of a metrics dashboard."
 */
export function useDailyBrief(): DailyBriefLoadState {
  const [state, setState] = useState<DailyBriefLoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecentActivities(), fetchMetricsHistory(), fetchUpcomingGoal()])
      .then(([activities, history, upcomingGoal]) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const viewModel = assembleDailyBrief(activities, history, upcomingGoal, today);
        setState({ status: "ready", viewModel });
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
