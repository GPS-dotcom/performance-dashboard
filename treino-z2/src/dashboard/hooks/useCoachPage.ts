import { useEffect, useMemo, useState } from "react";
import { assembleDailyBrief } from "../../hooks/assembleDailyBrief";
import { getAlertHistory, getRecommendationHistory } from "../../coach";
import type { Alert, Recommendation } from "../../coach";
import { assembleWeeklyReport } from "./assembleWeeklyReport";
import type { WeeklyCoachReport } from "../../coach";
import { useAthleteData } from "./useAthleteData";
import type { LoadState } from "../types";

export interface CoachViewModel {
  recommendations: Recommendation[];
  alerts: Alert[];
  weeklyReport: WeeklyCoachReport | null;
  recommendationHistory: Recommendation[];
  alertHistory: Alert[];
}

/**
 * Coach page: reuses assembleDailyBrief (the same pure function the Home
 * page's Daily Brief is built from) over useAthleteData's already-fetched
 * activities/metricsHistory/upcomingGoal, so "today's priorities" here are
 * identical to Home's, computed once, not recalculated with different
 * logic. Adds the Weekly Coach Report and, once the athlete profile
 * resolves (a second, independent fetch -- recommendationHistory/alertHistory
 * are keyed by athlete id, not part of useAthleteData's own Promise.all),
 * this athlete's persisted recommendation/alert history.
 */
export function useCoachPage(): { state: LoadState<CoachViewModel>; retry: () => void } {
  const { state: athleteState, retry } = useAthleteData();
  const [history, setHistory] = useState<{ recommendations: Recommendation[]; alerts: Alert[] }>({ recommendations: [], alerts: [] });

  const athleteId = athleteState.status === "ready" ? athleteState.data.athlete?.id : undefined;

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    Promise.all([getRecommendationHistory(athleteId), getAlertHistory(athleteId)])
      .then(([recommendations, alerts]) => {
        if (!cancelled) setHistory({ recommendations, alerts });
      })
      .catch(() => {
        // History is supplementary -- today's priorities (from useAthleteData) must keep working even if it fails.
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const state = useMemo<LoadState<CoachViewModel>>(() => {
    if (athleteState.status !== "ready") return athleteState;
    const { activities, metricsHistory, upcomingGoal, today } = athleteState.data;
    const { brief } = assembleDailyBrief(activities, metricsHistory, upcomingGoal, today);
    const weeklyReport = assembleWeeklyReport(activities, metricsHistory, brief.recommendations, today);
    return {
      status: "ready",
      data: {
        recommendations: brief.recommendations,
        alerts: brief.alerts,
        weeklyReport,
        recommendationHistory: history.recommendations,
        alertHistory: history.alerts,
      },
    };
  }, [athleteState, history]);

  return { state, retry };
}
