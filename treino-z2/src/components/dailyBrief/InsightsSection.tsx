import type { Insight } from "../../intelligence";
import { Card } from "../ui/Card";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";
import { EmptyState } from "../ui/EmptyState";

/** Answers: "What's changing in my training?" */
export function InsightsSection({ insights }: { insights: Insight[] }) {
  return (
    <Card title="Insights">
      {insights.length === 0 ? (
        <EmptyState message="Not enough history yet to detect trends, plateaus or evolution." />
      ) : (
        <ul className="insight-list">
          {insights.map((insight) => (
            <li key={insight.id} className={`insight insight-${insight.severity}`}>
              <p>{insight.description}</p>
              <ConfidenceBadge confidence={insight.confidence} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
