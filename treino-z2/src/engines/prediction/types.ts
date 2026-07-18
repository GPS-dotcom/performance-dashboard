// Prediction Engine types, per DOMAIN_MODEL.md's Prediction entity:
// "Represents future estimations. Examples: Marathon Time, Half Marathon
// Time, Critical Power Projection, Injury Risk, Recovery Time. Generated
// only by the Prediction Engine."
//
// This module deliberately does NOT import from engines/intelligence/ or
// engines/activity/ -- per docs/ARCHITECTURE.md's guiding principle,
// "engines communicate through contracts, never direct dependencies."
// MetricSeriesPoint is redefined locally (same shape as the Intelligence
// Engine's own type) rather than imported, so this engine only depends on
// the Metrics Engine's *public* constants (imported from "../metrics",
// its barrel) and otherwise stays structurally independent.

export interface MetricSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface BestEffort {
  distanceKm: number;
  timeSec: number;
}
