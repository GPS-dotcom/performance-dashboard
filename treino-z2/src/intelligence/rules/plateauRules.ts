/** How many of the most recent points define the "recent window" a plateau/regression/acceleration is judged over. */
export const DEFAULT_PLATEAU_WINDOW = 6;

/** Coefficient of variation (stddev / |mean|) within this bound over the window counts as "flat" (stagnation). */
export const FLAT_CV_THRESHOLD = 0.03;

/**
 * Regression: a statistically real (see trendRules.MIN_TREND_POINTS/
 * STABLE_SLOPE_THRESHOLD_FRACTION) declining trend over the recent
 * window, using the same relative-slope classification trendAnalyzer
 * uses -- "regression" is a stagnation-detector-shaped question
 * ("what's this window doing?") answered with trendAnalyzer's own
 * direction logic, not a separate threshold.
 */

/**
 * Acceleration: the recent window's slope must exceed the whole
 * series' slope by at least this multiple to count as "accelerating"
 * rather than just "continuing the same trend faster than noise."
 */
export const ACCELERATION_SLOPE_MULTIPLIER = 1.5;
