// Thresholds for fatigueAnalyzer, operating on the Metrics Engine's own
// TrainingLoadPoint (ctl/atl/tsb) series. Distinct from recoveryRules:
// this module reads the *load* side (ATL/TSB), recoveryAnalyzer reads
// the Recovery Score itself. TSB's -30..+25 typical band matches the one
// calculateRecoveryScore already clamps to in the Metrics Engine.

/** TSB at or below this, sustained over the recent window, is "accumulated fatigue" (19_INSIGHTS_LIBRARY.md's "Excessive Fatigue" evidence: "elevated fatigue, high ATL"). */
export const ACCUMULATED_FATIGUE_TSB_THRESHOLD = -20;

/** How many of the most recent days must be at/below the TSB threshold to call the fatigue "sustained" rather than a one-off dip. */
export const ACCUMULATED_FATIGUE_MIN_CONSECUTIVE_DAYS = 5;

/** Week-over-week ATL increase at or above this fraction is "excess load" (19_INSIGHTS_LIBRARY.md's "Rapid Load Increase": "weekly load spike"). */
export const EXCESS_LOAD_WEEK_OVER_WEEK_INCREASE = 0.3;

/** TSB below this (more severe than ACCUMULATED_FATIGUE_TSB_THRESHOLD) raises the insight to critical severity. */
export const CRITICAL_FATIGUE_TSB_THRESHOLD = -30;
