import { EmptyState } from "../../components/ui/EmptyState";

export interface ChartSeries {
  key: string;
  color: string;
  label: string;
  values: (number | null)[];
}

export interface LineChartProps {
  /** X-axis labels, one per data point -- same length as every series' `values`. */
  labels: string[];
  series: ChartSeries[];
  height?: number;
  ariaLabel: string;
  emptyMessage?: string;
}

const WIDTH = 640;
const PAD = 24;

/**
 * Generic hand-rolled SVG line chart -- COMPONENT_LIBRARY.md's "Charts"
 * primitive, generalizing the multi-series pattern the Daily Brief's
 * FitnessTrendChart already established (no charting library exists in
 * this project; adding one for line charts alone would duplicate that
 * component's own approach rather than reuse it). Every Dashboard page
 * that plots a metric over time (Metrics, Predictions) renders through
 * this instead of hand-rolling its own <svg>.
 */
export function LineChart({ labels, series, height = 180, ariaLabel, emptyMessage = "Not enough history yet to draw a trend." }: LineChartProps) {
  if (labels.length < 2 || series.every((s) => s.values.every((v) => v == null))) {
    return <EmptyState message={emptyMessage} />;
  }

  const allValues = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);

  const x = (i: number) => PAD + (i / (labels.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => height - PAD - ((v - min) / (max - min || 1)) * (height - PAD * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" height={height} role="img" aria-label={ariaLabel}>
        <line x1={PAD} y1={y(0)} x2={WIDTH - PAD} y2={y(0)} stroke="var(--divider)" strokeWidth={1} />
        {series.map((s) => {
          const points = s.values.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter((p): p is string => p != null);
          if (points.length < 2) return null;
          const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
