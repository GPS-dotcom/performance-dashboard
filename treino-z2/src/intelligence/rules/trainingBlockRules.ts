/** Minimum activities/points a period needs before it's eligible for block/season/cycle comparison at all. */
export const MIN_PERIOD_ACTIVITIES = 3;

/**
 * A period's mean beats another's by at least this fraction to be called
 * "the best" (19_INSIGHTS_LIBRARY.md's "Best Training Block": "Current
 * block exceeds historical averages") rather than a marginal, noise-level
 * difference.
 */
export const BEST_PERIOD_MARGIN_FRACTION = 0.05;
