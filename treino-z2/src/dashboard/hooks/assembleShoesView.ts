import { analyzeShoePerformanceDifference, analyzeShoeWear, computeShoeUsageSummary, detectNewShoePersonalBests } from "../../intelligence";
import type { ActivityWithShoe, Insight, ShoeUsageSummary } from "../../intelligence";
import type { Activity } from "../../types";

export interface ShoesViewModel {
  usageSummaries: ShoeUsageSummary[];
  wearInsights: Insight[];
  performanceDifference: Insight | null;
  newPersonalBests: Insight[];
  /** True once at least one activity carries gear data -- see DASHBOARD_REPORT.md's Limitations for why this is false today. */
  hasGearData: boolean;
}

/**
 * Assembles the Shoes page's view model by handing activities to the
 * Intelligence Engine's shoeAnalyzer (analyzeShoeWear/computeShoeUsageSummary/
 * analyzeShoePerformanceDifference/detectNewShoePersonalBests) -- the
 * Dashboard never computes shoe mileage or wear itself.
 *
 * `strava_activities` has no shoe/gear column yet, and `Activity` has no
 * `shoe` field (see activityService.ts) -- every activity maps to
 * `shoe: null` here, so this always returns empty results today. The
 * wiring is real and forward-compatible: once the History module's Shoes
 * Manager (Phase B) adds a gear column and populates it, this page lights
 * up with no changes needed here.
 */
export function assembleShoesView(activities: Activity[], today: string): ShoesViewModel {
  const activitiesWithShoe: ActivityWithShoe[] = activities.map((a) => ({
    id: a.id,
    startDate: a.startDate,
    distanceM: a.distanceM,
    movingTimeS: a.movingTimeS,
    averageWatts: a.averageWatts,
    bestEfforts: a.bestEfforts,
    shoe: null,
  }));

  const usageSummaries = computeShoeUsageSummary(activitiesWithShoe);
  const wearInsights = analyzeShoeWear(activitiesWithShoe, today);
  const performanceDifference = analyzeShoePerformanceDifference(activitiesWithShoe, today);
  const newPersonalBests = detectNewShoePersonalBests(activitiesWithShoe, today);

  return { usageSummaries, wearInsights, performanceDifference, newPersonalBests, hasGearData: activitiesWithShoe.some((a) => a.shoe != null) };
}
