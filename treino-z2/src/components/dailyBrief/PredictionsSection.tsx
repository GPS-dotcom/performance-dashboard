import type { MetricResult } from "../../engines/metrics";
import type { RacePrediction } from "../../engines/prediction";
import { formatDuration } from "../../utils/format";

export interface PredictionsSectionProps {
  racePredictions: { label: string; result: MetricResult<RacePrediction> }[];
}

/** Answers: "What could I run right now?" */
export function PredictionsSection({ racePredictions }: PredictionsSectionProps) {
  const available = racePredictions.filter((p) => p.result.value != null);

  return (
    <section className="brief-section">
      <div className="brief-section-label">Predictions</div>
      {available.length === 0 ? (
        <p className="empty-note">No best efforts synced yet -- predictions need at least one recorded race or time trial.</p>
      ) : (
        <ul className="prediction-list">
          {racePredictions.map(({ label, result }) => (
            <li key={label}>
              <span className="prediction-distance">{label}</span>
              {result.value == null ? (
                <span className="empty-note">Not enough data yet.</span>
              ) : (
                <>
                  <span className="prediction-time">{formatDuration(result.value.predictedTimeSec)}</span>
                  <span className="confidence-badge">{Math.round(result.confidence * 100)}% confidence</span>
                  <span className="prediction-method">
                    {result.value.method === "actual_best_effort" ? "real best effort" : `estimated from ${result.value.anchorDistanceKm}km`}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
