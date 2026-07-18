export * from "./trendAnalyzer";
// classifySeries/TrendClassification: the raw trend-direction primitive
// analyzeTrend itself is built on. Exposed publicly (not just an
// internal detail of ./shared) because callers like
// hooks/assembleDailyBrief.ts legitimately need the raw direction and
// confidence -- not a rendered Insight -- to feed the Coach Engine's
// TrainingSignals. This is still "interpreting a metric", the
// Intelligence Engine's job, not calculating one.
export * from "./shared/trendMath";
export * from "./consistencyAnalyzer";
export * from "./fatigueAnalyzer";
export * from "./recoveryAnalyzer";
export * from "./performanceAnalyzer";
export * from "./trainingBlockAnalyzer";
export * from "./shoeAnalyzer";
