// Every numeric threshold and classification rule used by this engine's
// analyzers/detectors lives here, and only here -- "Sem regras
// duplicadas" (no duplicated rules). Analyzers import from this barrel
// instead of hardcoding a threshold inline.

export * from "./confidenceRules";
export * from "./priorityRules";
export * from "./trendRules";
export * from "./plateauRules";
export * from "./consistencyRules";
export * from "./fatigueRules";
export * from "./recoveryRules";
export * from "./performanceRules";
export * from "./trainingBlockRules";
export * from "./shoeRules";
