// Coach Engine public surface.
//
// Per docs/ARCHITECTURE.md: "Coach Engine — turns everything into
// personalized, explainable recommendations; generates the 'Daily
// Brief'." This engine NEVER calculates a physiological metric (only the
// Metrics Engine does) and NEVER generates a prediction (only the
// Prediction Engine does) -- it only transforms already-computed
// metrics, Insights and Predictions into `Recommendation`/`Alert`
// objects: typed, explainable, always referencing the metrics/insights/
// predictions behind them.
//
// Layers:
//   types/            Recommendation/Alert envelopes + every signal input type
//   decision-engine/  Strategy Pattern -- Training Decision Engine (5-way load call)
//   recommendations/  Factory Pattern -- Recovery, Intensity, Volume, Rest,
//                      Nutrition, Hydration, Race Strategy
//   alerts/           Factory Pattern -- Overtraining, Performance Drop, Elevated
//                      Fatigue, Injury Risk, Consistency Loss, Personal Records
//   generators/       Daily Brief Generator, Weekly Coach Report
//   planners/         Goal Coach
//   validators/       reusable guards + the shared "general confidence" formula
//   services/         the only layer that touches Supabase -- persist/read
//   repositories/     Supabase I/O for `recommendations` / `coach_alerts`
//
// tests/ (sibling to these, not co-located __tests__) mirrors this
// layout 1:1, matching the Intelligence/Prediction Engines' own
// test-layout convention.

export * from "./types";
export * from "./decision-engine";
export * from "./recommendations";
export * from "./alerts";
export * from "./generators";
export * from "./planners";
export * from "./validators";
export * from "./services";
export * from "./repositories";
