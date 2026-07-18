// Coach Engine public surface.
//
// Per 10_COACH_ENGINE.md: "The decision-making layer... transforms
// metrics, insights and predictions into personalized coaching
// recommendations. It is not a chatbot... It never calculates
// physiological metrics. It never predicts performance."
//
// Every function here is a deterministic rule cascade over values it was
// handed -- no LLM call, no metric calculation, no prediction. This
// directory only ever imports *types* (never a calculation or prediction
// function) from ../metrics and ../prediction, and nothing at all from
// ../activity or ../intelligence's calculation logic, so it is
// structurally unable to compute a metric or forecast a result itself.
//
// Two rule branches (in trainingRecommendation.ts) reproduce
// COACH_ENGINE.md's own two worked examples exactly -- confidence 92% for
// "fatigue increased" -> Easy Run (p.50), and 95% for "recovery high,
// fatigue low" -> Threshold (p.54) -- rather than approximating them with
// a generic formula.

export * from "./types";
export * from "./trainingRecommendation";
export * from "./workoutFeedback";
export * from "./recoveryRecommendation";
export * from "./raceStrategy";
export * from "./alerts";
export * from "./dailyBrief";
export * from "./persistence";
