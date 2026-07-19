import type { MetricSeriesPoint } from "../types/seriesTypes";

export function hasMinPoints(series: unknown[], min: number): boolean {
  return Array.isArray(series) && series.length >= min;
}

export function sortByDate(series: MetricSeriesPoint[]): MetricSeriesPoint[] {
  return [...series].sort((a, b) => a.date.localeCompare(b.date));
}
