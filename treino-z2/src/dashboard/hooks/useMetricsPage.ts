import { useMemo } from "react";
import { assembleMetricsView } from "./assembleMetricsView";
import type { MetricsViewModel } from "./assembleMetricsView";
import { useAthleteData } from "./useAthleteData";
import type { LoadState } from "../types";

export function useMetricsPage(): { state: LoadState<MetricsViewModel>; retry: () => void } {
  const { state: athleteState, retry } = useAthleteData();

  const state = useMemo<LoadState<MetricsViewModel>>(() => {
    if (athleteState.status !== "ready") return athleteState;
    const { activities, metricsHistory, athlete, today } = athleteState.data;
    return { status: "ready", data: assembleMetricsView(activities, metricsHistory, athlete, today) };
  }, [athleteState]);

  return { state, retry };
}
