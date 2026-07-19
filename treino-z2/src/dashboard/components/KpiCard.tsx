import type { TrendDirection } from "../../coach";

export interface KpiCardProps {
  label: string;
  value: string;
  /** e.g. "km", "bpm", "W" -- rendered smaller, right after `value`. */
  unit?: string;
  trend?: TrendDirection | null;
  helpText?: string;
}

const TREND_SYMBOL: Record<TrendDirection, string> = { increasing: "↑", decreasing: "↓", stable: "→" };

/** COMPONENT_LIBRARY.md's "KPI Cards" -- a single already-computed number (never calculated here), with an optional trend arrow. */
export function KpiCard({ label, value, unit, trend, helpText }: KpiCardProps) {
  return (
    <div className="dash-kpi-card">
      <p className="dash-kpi-label">{label}</p>
      <p className="dash-kpi-value">
        {value}
        {unit && <span className="dash-kpi-unit">{unit}</span>}
        {trend && (
          <span className={`dash-kpi-trend dash-kpi-trend-${trend}`} aria-label={`Trend: ${trend}`}>
            {TREND_SYMBOL[trend]}
          </span>
        )}
      </p>
      {helpText && <p className="dash-kpi-help">{helpText}</p>}
    </div>
  );
}
