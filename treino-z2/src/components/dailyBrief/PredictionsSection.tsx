import type { MetricResult } from "../../metrics";
import type { RacePrediction } from "../../engines/prediction";
import { formatDuration } from "../../utils/format";
import { Card } from "../ui/Card";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";
import { EmptyState } from "../ui/EmptyState";

export interface PredictionsSectionProps {
  racePredictions: { label: string; result: MetricResult<RacePrediction> }[];
}

/** Answers: "What could I run right now?" */
export function PredictionsSection({ racePredictions }: PredictionsSectionProps) {
  const available = racePredictions.filter((p) => p.result.value != null);

  return (
    <Card title="Predictions">
      {available.length === 0 ? (
        <EmptyState message="No best efforts synced yet -- predictions need at least one recorded race or time trial." />
      ) : (
        <ul className="prediction-list">
          {racePredictions.map(({ label, result }) => (
            <li key={label}>
              <span className="prediction-distance">{label}</span>
              {result.value == null ? (
                <span className="ui-empty-state">Not enough data yet.</span>
              ) : (
                <>
                  <span className="prediction-time">{formatDuration(result.value.predictedTimeSec)}</span>
                  <ConfidenceBadge confidence={result.confidence} />
                  <span className="prediction-method">
                    {result.value.method === "actual_best_effort" ? "real best effort" : `estimated from ${result.value.anchorDistanceKm}km`}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
