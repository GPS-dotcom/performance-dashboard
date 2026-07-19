// Every analyzer/detector in this engine consumes MetricSeriesPoint[] --
// the Metrics Engine's own output shape (a date + a calculated value) --
// and never raw Activity/Lap/Record data directly for its *metric*
// interpretation. Some analyzers (Consistency, Performance, Shoe) do
// consume Activity[] because their subject matter (sessions, PRs,
// equipment) isn't itself a Metrics Engine output -- see each analyzer's
// own input type for why.

export interface MetricSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/** Whether a rising value is good (e.g. CTL) or bad (e.g. pace, where lower is faster). */
export type MetricPolarity = "higher_is_better" | "lower_is_better";
