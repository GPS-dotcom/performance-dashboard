// Intelligence Engine public surface.
//
// Per 08_INTELLIGENCE_ENGINE.md: "The Intelligence Engine is the brain of
// Treino Z2. It transforms physiological metrics into coaching
// decisions, recommendations, explanations and adaptive training
// actions... Unlike the Metrics Engine, which only calculates values,
// the Intelligence Engine interprets them in context." This module NEVER
// calculates a physiological metric itself -- every analyzer/detector
// here consumes MetricSeriesPoint[]/TrainingLoadPoint[] (the Metrics
// Engine's own output shapes) or Activity[], and interprets them into
// structured Insight objects. It also never generates a recommendation
// (DEC-0006: that's the Coach Engine's job) -- every Insight's
// `relatedRecommendations` is always empty at the source.
//
// Layers:
//   types/         Insight structure + shared series/analyzer-input types
//   rules/         every threshold/classification rule, in exactly one place
//   insights/      the only place Insight objects (and their title/description text) are assembled
//   analyzers/     Trend, Consistency, Fatigue, Recovery, Performance, Training Block, Shoe
//   detectors/     Plateau Detector (stagnation/regression/acceleration)
//   services/      the only layer that touches Supabase -- persist/read insights
//   repositories/  Supabase I/O for the `insights` table
//
// tests/ (sibling to these, not co-located __tests__) mirrors this
// layout 1:1.

export * from "./types";
export * from "./rules";
export * from "./insights";
export * from "./analyzers";
export * from "./detectors";
export * from "./services";
export * from "./repositories";
