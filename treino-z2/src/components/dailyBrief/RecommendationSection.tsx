import type { Recommendation } from "../../coach";
import { Card } from "../ui/Card";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";

/** Answers: "What should I do today?" */
export function RecommendationSection({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card title="Today's Recommendation">
      <p className="brief-statement">
        <strong>{recommendation.title}</strong> -- {recommendation.reasoning}
      </p>
      {recommendation.supportingMetrics.length > 0 && (
        <ul className="evidence-list">
          {recommendation.supportingMetrics.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p className="brief-substatement">{recommendation.description}</p>
      <div className="confidence-row">
        <ConfidenceBadge confidence={recommendation.confidence} />
      </div>
    </Card>
  );
}
