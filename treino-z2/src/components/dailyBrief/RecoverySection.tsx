import type { Prediction, RecoveryModelValue } from "../../prediction";
import type { Recommendation } from "../../engines/coach";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

export interface RecoverySectionProps {
  score: number | null;
  label: string;
  recoveryTime: Prediction<RecoveryModelValue> | null;
  recommendations: Recommendation[];
}

/** Answers: "Am I recovered?" */
export function RecoverySection({ score, label, recoveryTime, recommendations }: RecoverySectionProps) {
  const recoveryTimeSentence =
    recoveryTime?.value == null
      ? null
      : recoveryTime.value.daysUntilRecovered === 0
        ? "You're fresh -- fully recovered assuming no unusual fatigue."
        : `Estimated ${recoveryTime.value.daysUntilRecovered} day${recoveryTime.value.daysUntilRecovered === 1 ? "" : "s"} of rest until fully recovered.`;

  return (
    <Card title="Recovery">
      {score == null ? (
        <EmptyState message="Not enough training history yet to estimate recovery." />
      ) : (
        <p className="brief-statement">{`Recovery is ${label} (${score.toFixed(0)}%).`}</p>
      )}
      {recoveryTimeSentence && <p className="brief-substatement">{recoveryTimeSentence}</p>}
      {recommendations.length > 0 && (
        <ul className="recommendation-list">
          {recommendations.map((rec) => (
            <li key={rec.recommendation}>
              <strong>{rec.recommendation}</strong> -- {rec.reason}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
