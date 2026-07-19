import { Card } from "../../components/ui/Card";
import { LineChart } from "./LineChart";
import type { ChartSeries } from "./LineChart";

export interface TrendCardProps {
  title: string;
  labels: string[];
  series: ChartSeries[];
  ariaLabel: string;
  emptyMessage?: string;
}

/** COMPONENT_LIBRARY.md's "Trend Cards" -- a titled Card wrapping a LineChart, for any metric evolution. */
export function TrendCard({ title, labels, series, ariaLabel, emptyMessage }: TrendCardProps) {
  return (
    <Card title={title}>
      <LineChart labels={labels} series={series} ariaLabel={ariaLabel} emptyMessage={emptyMessage} />
    </Card>
  );
}
