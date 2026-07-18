import type { Recommendation } from "../../engines/coach";
import { Card } from "../ui/Card";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";

/** Answers: "What should I do today?" */
export function RecommendationSection({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card title="Today's Recommendation">
      <p className="brief-statement">
        <strong>{recommendation.recommendation}</strong> -- {recommendation.reason}
      </p>
      {recommendation.evidence.length > 0 && (
        <ul className="evidence-list">
          {recommendation.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p className="brief-substatement">{recommendation.expectedOutcome}</p>
      <div className="confidence-row">
        <ConfidenceBadge confidence={recommendation.confidence} />
        {recommendation.alternative && <span className="alternative-note">{recommendation.alternative}</span>}
      </div>
    </Card>
  );
}
