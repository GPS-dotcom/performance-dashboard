import type { Recommendation } from "../../engines/coach";

/** Answers: "What should I do today?" */
export function RecommendationSection({ recommendation }: { recommendation: Recommendation }) {
  return (
    <section className="brief-section">
      <div className="brief-section-label">Today's Recommendation</div>
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
        <span className="confidence-badge">{Math.round(recommendation.confidence * 100)}% confidence</span>
        {recommendation.alternative && <span className="alternative-note">{recommendation.alternative}</span>}
      </div>
    </section>
  );
}
