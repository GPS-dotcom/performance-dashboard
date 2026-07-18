/** True when `items` has at least `minLength` elements. */
export function hasMinLength<T>(items: T[], minLength: number): boolean {
  return items.length >= minLength;
}

/** Number of distinct values produced by `keyOf` across `items`. */
export function countDistinctBy<T, K>(items: T[], keyOf: (item: T) => K): number {
  return new Set(items.map(keyOf)).size;
}

/**
 * True when `values` never decreases from one element to the next.
 * Used to validate that a lactate/incremental test's stage intensities
 * were administered in the increasing order the interpolation math
 * assumes.
 */
export function isMonotonicNonDecreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) return false;
  }
  return true;
}
