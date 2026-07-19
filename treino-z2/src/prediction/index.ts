// Prediction Engine public surface.
//
// Per docs/ARCHITECTURE.md: "Prediction Engine — forecasts future
// performance (race times, FTP, recovery, injury risk, race readiness)."
// This engine NEVER calculates a physiological metric itself (only the
// Metrics Engine does) and NEVER generates a recommendation (only the
// Coach Engine does) -- it only produces `Prediction<T>` objects: typed,
// explainable forecasts with a confidence interval, explicit assumptions,
// and an expiry, built from Metrics Engine output (and, optionally,
// Intelligence Engine Insight ids passed in as `supportingInsights`).
//
// Layers:
//   types/       Prediction<T> envelope + supporting input types
//   models/      PredictionModel<TInput,TValue> interface -- the ML-swap boundary
//   algorithms/  every concrete model (Riegel, linear trend, ACWR, monotony, ...),
//                each documented and each implementing PredictionModel
//   validators/  reusable input guards
//   predictors/  Race, Fitness, Threshold, Recovery, Injury Risk, Goal, Readiness --
//                the only place a PredictionModel is called and wrapped into a Prediction<T>
//   services/    the only layer that touches Supabase -- persist/read predictions
//   repositories/ Supabase I/O for the `predictions` table
//
// tests/ (sibling to these, not co-located __tests__) mirrors this
// layout 1:1, matching the Intelligence Engine's own test-layout
// convention.

export * from "./types";
export * from "./models";
export * from "./algorithms";
export * from "./validators";
export * from "./predictors";
export * from "./services";
export * from "./repositories";
