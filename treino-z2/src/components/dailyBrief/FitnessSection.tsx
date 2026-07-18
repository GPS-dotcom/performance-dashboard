import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

export interface FitnessSectionProps {
  score: number | null;
  label: string;
  trendExplanation: string | null;
}

/** Answers: "Am I getting fitter?" */
export function FitnessSection({ score, label, trendExplanation }: FitnessSectionProps) {
  return (
    <Card title="Fitness">
      {score == null ? (
        <EmptyState message="Not enough training history yet to estimate fitness." />
      ) : (
        <p className="brief-statement">{`Fitness is ${label} (${score.toFixed(0)}%).`}</p>
      )}
      {trendExplanation && <p className="brief-substatement">{trendExplanation}</p>}
    </Card>
  );
}
