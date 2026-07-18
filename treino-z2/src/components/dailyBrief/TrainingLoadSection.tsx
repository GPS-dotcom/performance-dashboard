import type { TrainingLoadPoint } from "../../engines/metrics";
import { Card } from "../ui/Card";
import { FitnessTrendChart } from "./FitnessTrendChart";

export interface TrainingLoadSectionProps {
  history: TrainingLoadPoint[];
}

function balanceSentence(latest: TrainingLoadPoint | null): string {
  if (latest == null) return "Not enough training history yet to assess load balance.";
  if (latest.tsb < -20) return `Training load is running well ahead of recovery (TSB ${latest.tsb.toFixed(1)}) -- fatigue is accumulating.`;
  if (latest.tsb < 0) return `Training load is slightly ahead of recovery (TSB ${latest.tsb.toFixed(1)}) -- normal during a build phase.`;
  if (latest.tsb < 15) return `Training load is well balanced with recovery (TSB ${latest.tsb.toFixed(1)}).`;
  return `Fatigue is low relative to fitness (TSB ${latest.tsb.toFixed(1)}) -- a good window for harder training.`;
}

/** Answers: "Is my training load balanced?" */
export function TrainingLoadSection({ history }: TrainingLoadSectionProps) {
  const latest = history.length > 0 ? history[history.length - 1] : null;

  return (
    <Card title="Training Load">
      <p className="brief-statement">{balanceSentence(latest)}</p>
      <FitnessTrendChart history={history} />
    </Card>
  );
}
