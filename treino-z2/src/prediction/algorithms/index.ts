// Only the model objects (the PredictionModel-conforming boundary
// predictors/ actually calls) and their input/value types are
// re-exported here -- each file's raw `predict*` function stays a named
// export of that file alone (directly importable for focused unit
// testing) but is deliberately NOT re-exported through this barrel: it
// shares a name with the corresponding function in `predictors/`
// (e.g. both this layer and `predictors/injuryRiskPredictor.ts` have a
// `predictAcuteLoadRisk`), and only one of the two -- the predictor,
// which returns a full `Prediction<T>` -- belongs on the engine's public
// surface.

export type { LinearRegressionResult } from "./shared/linearRegression";
export { linearRegression } from "./shared/linearRegression";

export { PREDICTION_INTERVAL_Z, regressionPredictionInterval, heuristicBound } from "./shared/confidenceInterval";

export type { InjuryRiskValue } from "./shared/injuryRiskValue";

export type { RaceModelInput, RaceModelValue } from "./riegelRaceModel";
export { riegelRaceModel } from "./riegelRaceModel";

export type { TrendModelInput, TrendModelValue } from "./linearTrendModel";
export { linearTrendModel } from "./linearTrendModel";

export type { RecoveryModelInput, RecoveryModelValue, LoadImpactModelInput, LoadImpactModelValue } from "./atlDecayRecoveryModel";
export { atlDecayRecoveryModel, currentLoadImpactModel } from "./atlDecayRecoveryModel";

export type { AcuteLoadRiskInput, AcuteLoadRiskValue } from "./acwrInjuryRiskModel";
export { acwrInjuryRiskModel } from "./acwrInjuryRiskModel";

export type { MonotonyModelInput, MonotonyRiskValue } from "./monotonyStrainModel";
export { monotonyStrainModel } from "./monotonyStrainModel";

export type { AccumulatedFatigueRiskInput } from "./accumulatedFatigueRiskModel";
export { accumulatedFatigueRiskModel } from "./accumulatedFatigueRiskModel";

export type { ReadinessModelInput, ReadinessValue } from "./readinessModel";
export { raceReadinessModel, hardTrainingReadinessModel } from "./readinessModel";

export type { GoalModelInput, GoalPredictionValue } from "./goalProbabilityModel";
export { goalProbabilityModel } from "./goalProbabilityModel";
