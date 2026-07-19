import { useMemo } from "react";
import { assemblePredictionsView } from "./assemblePredictionsView";
import type { PredictionsViewModel } from "./assemblePredictionsView";
import { useAthleteData } from "./useAthleteData";
import type { LoadState } from "../types";

export function usePredictionsPage(): { state: LoadState<PredictionsViewModel>; retry: () => void } {
  const { state: athleteState, retry } = useAthleteData();

  const state = useMemo<LoadState<PredictionsViewModel>>(() => {
    if (athleteState.status !== "ready") return athleteState;
    const { activities, metricsHistory, today } = athleteState.data;
    return { status: "ready", data: assemblePredictionsView(activities, metricsHistory, today) };
  }, [athleteState]);

  return { state, retry };
}
