import type { Prediction } from "../../prediction";
import { ConfidenceBadge } from "../../components/ui/ConfidenceBadge";
import { EmptyState } from "../../components/ui/EmptyState";

export interface PredictionCardProps<T> {
  label: string;
  prediction: Prediction<T>;
  /** Formats `prediction.value` into display text -- left to the caller since the shape varies per PredictionType. */
  formatValue: (value: T) => string;
}

/** COMPONENT_LIBRARY.md's "Prediction Cards" -- one Prediction Engine forecast, with its confidence and assumptions always visible ("Nenhuma previsão pode ser uma caixa preta"). */
export function PredictionCard<T>({ label, prediction, formatValue }: PredictionCardProps<T>) {
  return (
    <li className="dash-prediction-card">
      <span className="prediction-distance">{label}</span>
      {prediction.value == null ? (
        <EmptyState message="Not enough data yet." />
      ) : (
        <>
          <span className="prediction-time">{formatValue(prediction.value)}</span>
          <ConfidenceBadge confidence={prediction.confidence} />
          {prediction.assumptions.length > 0 && <span className="prediction-method">{prediction.assumptions.join("; ")}</span>}
        </>
      )}
    </li>
  );
}
