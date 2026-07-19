// Redefined locally rather than imported from the Intelligence Engine --
// per docs/ARCHITECTURE.md's "engines communicate through contracts,
// never direct dependencies", this engine only depends on the Metrics
// Engine's public barrel (for TrainingLoadPoint) and otherwise stays
// structurally independent, exactly as the previous engines/prediction
// module already did (see its own types.ts).

export interface MetricSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export type MetricPolarity = "higher_is_better" | "lower_is_better";

export interface BestEffort {
  distanceKm: number;
  timeSec: number;
}
