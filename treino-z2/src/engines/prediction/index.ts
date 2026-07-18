// Prediction Engine public surface.
//
// Per DOMAIN_MODEL.md: "Prediction... Represents future estimations.
// Examples: Marathon Time, Half Marathon Time, Critical Power Projection,
// Injury Risk, Recovery Time. Generated only by the Prediction Engine."
//
// Every calculation function documents, inline, which named algorithm it
// implements: Riegel's formula (race predictions), least-squares linear
// trend extrapolation (LT1/LT2 evolution, Critical Power projection), the
// Acute:Chronic Workload Ratio (injury risk, Gabbett 2016), and an
// analytical solve of the Metrics Engine's own ATL decay model (recovery
// time). Every result is a MetricResult, so every prediction carries a
// confidence score alongside dataQuality/requiredInputs/missingInputs.
//
// This module only consumes the Metrics Engine's public contract (its
// barrel, "../metrics") -- never engines/activity/ or engines/intelligence/
// -- matching docs/ARCHITECTURE.md's guiding principle that "engines
// communicate through contracts, never direct dependencies."

export * from "./types";
export * from "./racePrediction";
export * from "./thresholdProjection";
export * from "./injuryRisk";
export * from "./recoveryTime";
export * from "./persistence";
