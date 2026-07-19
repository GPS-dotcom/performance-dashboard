// recoveryAnalyzer compares the Recovery Score series' own trend
// direction against the TSB series' trend direction (both already
// computed by the Metrics Engine) -- it never recomputes a "predicted"
// recovery score from TSB itself, since that formula is
// calculateRecoveryScore's private implementation detail and
// reimplementing it here would be exactly the duplicated-metric-logic
// this engine is required not to do. Instead: if Recovery Score is
// trending in a *better* direction than what TSB alone would suggest,
// that's "above expected"; if it's trending *worse* than TSB alone would
// suggest, that's "below expected." Divergence is judged qualitatively
// (direction mismatch, or same direction but recovery clearly flatter/
// steeper), not against a numeric conversion constant.

/** Minimum points required in both series before a comparison is meaningful. */
export const MIN_POINTS_FOR_RECOVERY_COMPARISON = 4;
