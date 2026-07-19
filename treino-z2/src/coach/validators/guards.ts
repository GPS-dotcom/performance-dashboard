export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** True when at least one of the given values is non-null -- used to decide whether a rule has anything to reason about at all. */
export function hasAnySignal(...values: unknown[]): boolean {
  return values.some((v) => v != null);
}
