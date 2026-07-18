import type { Activity } from "../../types";

export interface WeeklyLoadSummary {
  activityCount: number;
  distanceKm: number;
  movingTimeS: number;
  /**
   * Sum of each activity's externally-supplied `rtss` field (the sync
   * provider's own Relative TSS). This reads an already-computed value
   * rather than calculating one, the same way assembleDailyBrief reads
   * ctl/atl/tsb from `daily_pmc` -- for a total built from *this
   * engine's own* Training Load, run trainingLoadCalculator per
   * session first and sum its `load` outputs instead.
   */
  totalExternalRtss: number;
}

/** Aggregates activities within [startIso, endIso) (both ISO date strings, end exclusive) into period totals. */
export function analyzeWeeklyLoad(activities: Activity[], startIso: string, endIso: string): WeeklyLoadSummary {
  const inRange = activities.filter((a) => a.startDate >= startIso && a.startDate < endIso);

  let distanceKm = 0;
  let movingTimeS = 0;
  let totalExternalRtss = 0;

  for (const activity of inRange) {
    distanceKm += (activity.distanceM ?? 0) / 1000;
    movingTimeS += activity.movingTimeS ?? 0;
    totalExternalRtss += activity.rtss ?? 0;
  }

  return { activityCount: inRange.length, distanceKm, movingTimeS, totalExternalRtss };
}
