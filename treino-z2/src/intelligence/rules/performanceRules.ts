// performanceAnalyzer thresholds. PR detection itself needs no
// threshold (a best effort is either faster than every prior one at that
// distance, or it isn't) -- "evolution by distance/power/pace" reuses
// trendRules' MIN_TREND_POINTS/STABLE_SLOPE_THRESHOLD_FRACTION via the
// same shared trend classification analyzers/shared exposes, so nothing
// here duplicates those.

/** A best effort within this fraction of the previous best still counts as a PR (floating point / rounding tolerance). */
export const PR_TIE_TOLERANCE_FRACTION = 0.0005;

/** Minimum number of best efforts at a given distance before an "evolution by distance" trend is reported. */
export const MIN_EFFORTS_FOR_DISTANCE_EVOLUTION = 4;
