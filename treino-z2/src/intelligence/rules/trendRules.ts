// Shared by trendAnalyzer and plateauDetector -- both classify the shape
// of a metric series over time, so the same "is this really moving"
// threshold applies to both rather than each defining its own.

/** A regression needs at least this many points before a trend is meaningful. */
export const MIN_TREND_POINTS = 4;

/** A slope smaller than this fraction of the series mean, per day, doesn't read as a real trend. */
export const STABLE_SLOPE_THRESHOLD_FRACTION = 0.01;

/** Confidence saturates once a series reaches this many points -- more history stops adding certainty. */
export const TREND_CONFIDENCE_SATURATION_POINTS = 14;
