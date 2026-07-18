import type { Insight } from "../../engines/intelligence";

/** Answers: "What's changing in my training?" */
export function InsightsSection({ insights }: { insights: Insight[] }) {
  return (
    <section className="brief-section">
      <div className="brief-section-label">Insights</div>
      {insights.length === 0 ? (
        <p className="empty-note">Not enough history yet to detect trends, plateaus or evolution.</p>
      ) : (
        <ul className="insight-list">
          {insights.map((insight) => (
            <li key={`${insight.kind}-${insight.metricName}`} className={`insight insight-${insight.severity}`}>
              <p>{insight.explanation}</p>
              <span className="confidence-badge">{Math.round(insight.confidence * 100)}% confidence</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
