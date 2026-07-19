import { useCallback, useEffect, useState } from "react";
import { fetchMetricsHistory, fetchRecentActivities } from "../../services/activityService";
import { fetchUpcomingGoal } from "../../services/goalService";
import type { UpcomingGoal } from "../../services/goalService";
import type { Activity, MetricsSnapshot } from "../../types";
import { fetchCurrentAthlete } from "../services/athleteProfileService";
import type { AthleteProfile } from "../services/athleteProfileService";
import type { LoadState } from "../types";
import { extractErrorMessage } from "../../utils/errorMessage";

export interface AthleteData {
  activities: Activity[];
  metricsHistory: MetricsSnapshot[];
  upcomingGoal: UpcomingGoal | null;
  athlete: AthleteProfile | null;
  today: string;
}

export interface UseAthleteDataResult {
  state: LoadState<AthleteData>;
  retry: () => void;
}

/**
 * The Dashboard's single data-loading entry point: every one of the 8
 * pages is a read-only view over this same already-fetched
 * activities/metricsHistory/upcomingGoal/athlete tuple (plus, for Coach
 * and Laboratory, a second fetch keyed off `athlete.id` -- see
 * useCoachPage/useLaboratoryPage). Mirrors useDailyBrief's own
 * Promise.all + loading/error/ready state shape, generalized to feed
 * more than one page instead of being Home-only.
 */
export function useAthleteData(): UseAthleteDataResult {
  const [state, setState] = useState<LoadState<AthleteData>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    Promise.all([fetchRecentActivities(), fetchMetricsHistory(), fetchUpcomingGoal(), fetchCurrentAthlete()])
      .then(([activities, metricsHistory, upcomingGoal, athlete]) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        setState({ status: "ready", data: { activities, metricsHistory, upcomingGoal, athlete, today } });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: "error", message: extractErrorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { state, retry };
}
