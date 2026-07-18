// Small, composable guards every calculator uses to decide whether an
// input is usable, instead of each calculator re-writing its own
// `!= null && x > 0` checks. Keeping these here means the definition of
// "a usable positive number" only exists once across all 16 calculators.

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Clamps `value` into [min, max]. Used to keep 0-100 scores and 0-1 confidences in range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
