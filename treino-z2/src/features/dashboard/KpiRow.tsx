interface Kpi {
  label: string;
  value: string;
  unit?: string;
}

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="kpi-row">
      {kpis.map((kpi) => (
        <div className="kpi" key={kpi.label}>
          <div className="kpi-label">{kpi.label}</div>
          <div className="kpi-value">
            {kpi.value}
            {kpi.unit && <span className="kpi-unit">{kpi.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
