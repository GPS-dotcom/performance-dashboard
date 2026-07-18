// Metrics Engine public surface.
//
// Per DOMAIN_MODEL.md (page 39): LT1, LT2, Critical Power, HR Drift, CTL,
// ATL, TSB, Running Effectiveness, Recovery Score and Fitness Score are
// each listed as a "Metric... Generated only by the Metrics Engine." This
// module is that engine's entire public surface -- every one of those ten
// metrics is calculated in exactly one place, here, and nowhere else in
// this codebase. All of it is pure/stateless (07_METRICS_ENGINE.md,
// Design rules: "deterministic, stateless, pure calculations"): nothing
// in this directory imports the Supabase client or does any I/O.

export * from "./metricResult";
export * from "./lactateThreshold";
export * from "./criticalPower";
export * from "./hrDrift";
export * from "./trainingLoad";
export * from "./runningEffectiveness";
export * from "./recoveryScore";
export * from "./fitnessScore";
export * from "./metricsEngine";
