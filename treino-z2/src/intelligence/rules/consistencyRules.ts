// Thresholds for consistencyAnalyzer. 19_INSIGHTS_LIBRARY.md's
// Consistency Insights only names the outcomes ("Excellent Training
// Consistency: few missed sessions, stable volume"; "Reduced
// Consistency: training interruptions detected") without numeric
// thresholds, so these operationalize that language.

/** Fraction of the analyzed weeks that must have >= 1 session to call frequency "excellent". */
export const EXCELLENT_FREQUENCY_MIN_ACTIVE_WEEK_FRACTION = 0.85;

/** Fraction of weeks with 0 sessions ("missed weeks") at or above this counts as "reduced" consistency. */
export const REDUCED_CONSISTENCY_MISSED_WEEK_FRACTION = 0.3;

/** Week-to-week volume coefficient of variation at or below this counts as "stable volume". */
export const STABLE_VOLUME_CV_THRESHOLD = 0.35;

/** Minimum weeks of history required before a consistency insight is generated at all. */
export const MIN_WEEKS_FOR_CONSISTENCY_INSIGHT = 3;

/** Plan adherence (completed / planned sessions) at or above this counts as "on plan". */
export const GOOD_ADHERENCE_RATIO = 0.8;

/** More than this many *consecutive* 0-session weeks counts as a training interruption (regularity), distinct from the overall missed-week fraction (frequency). */
export const MAX_REGULAR_GAP_WEEKS = 1;
