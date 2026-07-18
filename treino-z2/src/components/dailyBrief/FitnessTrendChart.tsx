import type { MetricsSnapshot } from "../../types";

interface Series {
  key: keyof Pick<MetricsSnapshot, "ctl" | "atl" | "tsb">;
  color: string;
  label: string;
}

const SERIES: Series[] = [
  { key: "ctl", color: "#2a78d6", label: "Fitness (CTL)" },
  { key: "atl", color: "#e34948", label: "Fatigue (ATL)" },
  { key: "tsb", color: "#eda100", label: "Form (TSB)" },
];

const WIDTH = 640;
const HEIGHT = 180;
const PAD = 24;

export function FitnessTrendChart({ history }: { history: MetricsSnapshot[] }) {
  if (history.length < 2) {
    return <p className="empty-note">Not enough history yet to draw a trend.</p>;
  }

  const allValues = history.flatMap((s) => [s.ctl, s.atl, s.tsb]);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);

  const x = (i: number) => PAD + (i / (history.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - ((v - min) / (max - min || 1)) * (HEIGHT - PAD * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Fitness trend">
        <line x1={PAD} y1={y(0)} x2={WIDTH - PAD} y2={y(0)} stroke="var(--divider)" strokeWidth={1} />
        {SERIES.map((s) => {
          const d = history.map((point, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(point[s.key])}`).join(" ");
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
      </svg>
      <div className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
