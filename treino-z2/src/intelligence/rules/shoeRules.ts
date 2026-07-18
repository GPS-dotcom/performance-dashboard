// shoeAnalyzer thresholds. Running shoe midsole cushioning is broadly
// documented (running shoe manufacturers' own care guidance; RRCA and
// Runner's World coaching literature) to degrade meaningfully somewhere
// in the 500-800km (300-500mi) range; 700km is used here as a single
// representative threshold within that widely-cited band.
export const SHOE_REPLACEMENT_MILEAGE_KM = 700;

/** Distance at/above this fraction of the replacement threshold triggers an early "approaching" warning. */
export const SHOE_APPROACHING_REPLACEMENT_FRACTION = 0.85;

/** Minimum activities on a shoe before its performance/mileage stats are considered reliable enough to report. */
export const MIN_ACTIVITIES_FOR_SHOE_INSIGHT = 5;

/** A shoe's average pace/power beats another's by at least this fraction to report a "Performance Difference Between Shoes". */
export const SHOE_PERFORMANCE_DIFFERENCE_FRACTION = 0.03;

/** A PR set within a shoe's first N activities counts as a "New Shoe Personal Best" rather than an ordinary PR. */
export const NEW_SHOE_ACTIVITY_COUNT_THRESHOLD = 3;
