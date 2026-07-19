import { useMemo } from "react";
import { assembleShoesView } from "./assembleShoesView";
import type { ShoesViewModel } from "./assembleShoesView";
import { useAthleteData } from "./useAthleteData";
import type { LoadState } from "../types";

export function useShoesPage(): { state: LoadState<ShoesViewModel>; retry: () => void } {
  const { state: athleteState, retry } = useAthleteData();

  const state = useMemo<LoadState<ShoesViewModel>>(() => {
    if (athleteState.status !== "ready") return athleteState;
    const { activities, today } = athleteState.data;
    return { status: "ready", data: assembleShoesView(activities, today) };
  }, [athleteState]);

  return { state, retry };
}
