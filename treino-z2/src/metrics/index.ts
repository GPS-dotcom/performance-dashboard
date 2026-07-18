// Metrics Engine public surface.
//
// Per 07_METRICS_ENGINE.md: "The Metrics Engine is responsible for
// transforming raw training data into objective physiological metrics.
// It performs calculations only." Every physiological metric this app
// calculates -- LT1, LT2, Critical Power, FTP, Pace/Heart Rate/Power
// Zones, CTL, ATL, TSB, HR Drift, Running Effectiveness, Efficiency
// Factor, Training Load, Recovery Score, Fitness Score, Fatigue Score --
// is calculated in exactly one place, this module tree, and nowhere else
// in this codebase.
//
// Layers, per "Design Principles" (deterministic, stateless, pure
// calculations, fully testable):
//   types/        shared result envelope + zone table shape
//   validators/   small guards calculators use to check their inputs
//   models/       input value objects (MaximalEffort, LactateStage, ...)
//   calculators/  one file per metric -- pure, no I/O, independently testable
//   analyzers/    compose calculators over a series (trend, zone time, weekly totals)
//   services/     the only layer that touches Supabase -- orchestrates
//                 repository reads, calculators/analyzers, repository writes
//   repositories/ Supabase I/O for metrics_snapshots and lactate_test*
//
// Everything under calculators/shared/ is an internal implementation
// detail (deduplicated math reused by 2+ calculators) and is
// deliberately not re-exported from here.

export * from "./types";
export * from "./validators";
export * from "./models";
export * from "./calculators";
export * from "./analyzers";
export * from "./services";
export * from "./repositories";
