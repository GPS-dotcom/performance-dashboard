import { useCallback, useEffect, useState } from "react";
import { fetchMetricsHistory, fetchRecentActivities } from "../services/activityService";
import { fetchUpcomingGoal } from "../services/goalService";
import { assembleDailyBrief } from "./assembleDailyBrief";
import type { DailyBriefViewModel } from "./assembleDailyBrief";
import { readDailyBriefCache, writeDailyBriefCache } from "./dailyBriefCache";
import { extractErrorMessage } from "../utils/errorMessage";

export type DailyBriefLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; viewModel: DailyBriefViewModel };

export interface UseDailyBriefResult {
  state: DailyBriefLoadState;
  /** DESIGN_SYSTEM.md's Error State requires a "Retry Option" -- re-runs the same fetch. */
  retry: () => void;
}

/**
 * Loads the athlete's activities, fitness history and upcoming goal, then
 * assembles the full Daily Brief view model (assembleDailyBrief) from
 * them. The Daily Brief replaces the old KPI-grid Dashboard as the home
 * screen -- per docs/ARCHITECTURE.md's DEC-0004, "the home screen becomes
 * a Daily Brief instead of a metrics dashboard."
 *
 * Stale-while-revalidate: on the very first load of a session (attempt
 * 0), a cached brief from sessionStorage -- if fresh enough -- is shown
 * immediately instead of a loading state, while this still kicks off a
 * real fetch in the background and replaces it once that resolves. If
 * that background fetch fails and cached data is already on screen, the
 * cached brief is left in place rather than being replaced by an error --
 * retry() always bypasses the cache and behaves exactly as before.
 */
export function useDailyBrief(): UseDailyBriefResult {
  const [state, setState] = useState<DailyBriefLoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = attempt === 0 ? readDailyBriefCache() : null;
    setState(cached ? { status: "ready", viewModel: cached } : { status: "loading" });

    Promise.all([fetchRecentActivities(), fetchMetricsHistory(), fetchUpcomingGoal()])
      .then(([activities, history, upcomingGoal]) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const viewModel = assembleDailyBrief(activities, history, upcomingGoal, today);
        setState({ status: "ready", viewModel });
        writeDailyBriefCache(viewModel);
      })
      .catch((err: unknown) => {
        if (cancelled || cached) return; // keep showing cached data rather than downgrade to an error
        setState({ status: "error", message: extractErrorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { state, retry };
}
