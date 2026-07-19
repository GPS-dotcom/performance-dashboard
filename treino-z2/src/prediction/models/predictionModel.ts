// The swap boundary requested by "Utilizar interfaces para permitir troca
// futura por modelos de Machine Learning": every algorithm in
// `algorithms/` implements `PredictionModel<TInput, TValue>`, and every
// predictor in `predictors/` calls a model only through this interface
// -- never a concrete algorithm's internals directly. Replacing e.g.
// Riegel's formula with a trained ML race-time model later means writing
// one new object that satisfies this interface and swapping it into
// `predictors/racePredictor.ts`; nothing else in the engine (the
// `Prediction<T>` envelope, the predictor's input validation, its
// persistence) needs to change.
//
// `modelId`/`version` are carried through so a future model swap is
// observable in stored predictions (which model produced this value?),
// the same reasoning `07_METRICS_ENGINE.md`'s "Versioned algorithms"
// design principle already established for the Metrics Engine.

export interface ModelOutput<TValue> {
  value: TValue | null;
  /** 0-1. */
  confidence: number;
  /**
   * Confidence interval bounds in the same unit as a numeric `value`;
   * null for structured (non-numeric) values or when unavailable.
   */
  lowerBound: number | null;
  upperBound: number | null;
  /** Explicit assumptions this specific output depends on. */
  assumptions: string[];
  /** Why value is null, or why confidence/the interval isn't tighter. Empty when nothing is missing. */
  missingInputs: string[];
}

export interface PredictionModel<TInput, TValue> {
  /** Stable identifier for this algorithm/model, e.g. "riegel-extrapolation". */
  readonly modelId: string;
  /** Bumped whenever the model's formula/parameters change in a way that could change its output for the same input. */
  readonly version: string;
  predict(input: TInput): ModelOutput<TValue>;
}

/** A model that could not produce a value at all -- missingInputs explains why. */
export function unavailableModelOutput<TValue>(missingInputs: string[]): ModelOutput<TValue> {
  return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs };
}
