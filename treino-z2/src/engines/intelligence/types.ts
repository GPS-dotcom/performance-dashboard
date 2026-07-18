// Intelligence Engine types, per 08_INTELLIGENCE_ENGINE.md.
//
// Every function in this engine consumes MetricSeriesPoint[] -- the
// Metrics Engine's own output shape (a date + a calculated value) -- and
// never raw Activity/Lap/Record data. This module imports nothing from
// engines/activity/, by design.

export interface MetricSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export type InsightSeverity = "info" | "warning" | "critical";

/** Whether a rising value is good (e.g. CTL) or bad (e.g. pace, where lower is faster). */
export type MetricPolarity = "higher_is_better" | "lower_is_better";

export interface Insight {
  kind: "trend" | "evolution" | "plateau" | "block_comparison" | "season_comparison";
  metricName: string;
  severity: InsightSeverity;
  confidence: number; // 0-1
  explanation: string;
  sourceMetrics: Record<string, unknown>;
  /** Always null: recommendations are the Coach Engine's responsibility (DEC-0006), not this engine's. */
  recommendation: null;
}
