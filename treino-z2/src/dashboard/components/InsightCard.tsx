import type { Insight } from "../../intelligence";
import { ConfidenceBadge } from "../../components/ui/ConfidenceBadge";

/** COMPONENT_LIBRARY.md's "Insight Cards" -- one Intelligence Engine Insight, presented verbatim (never re-derived here). */
export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <li className={`insight insight-${insight.severity}`}>
      <p>{insight.description}</p>
      {insight.evidence.length > 0 && (
        <ul className="evidence-list">
          {insight.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <ConfidenceBadge confidence={insight.confidence} />
    </li>
  );
}
