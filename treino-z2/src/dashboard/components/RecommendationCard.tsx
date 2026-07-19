import type { Recommendation } from "../../coach";
import { ConfidenceBadge } from "../../components/ui/ConfidenceBadge";

const PRIORITY_LABEL: Record<Recommendation["priority"], string> = { 1: "Urgent", 2: "High", 3: "Medium", 4: "Low", 5: "Optional" };

/** COMPONENT_LIBRARY.md's "Recommendation Cards" -- one Coach Engine Recommendation, presented verbatim. */
export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <li className="dash-recommendation-card">
      <div className="dash-recommendation-head">
        <strong>{recommendation.title}</strong>
        <span className={`ui-badge ui-badge-neutral`}>{PRIORITY_LABEL[recommendation.priority]}</span>
      </div>
      <p className="brief-substatement">{recommendation.description}</p>
      <p className="dash-recommendation-reasoning">{recommendation.reasoning}</p>
      <ConfidenceBadge confidence={recommendation.confidence} />
    </li>
  );
}
