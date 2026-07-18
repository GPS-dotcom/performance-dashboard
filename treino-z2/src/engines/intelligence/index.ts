// Intelligence Engine public surface.
//
// Per 08_INTELLIGENCE_ENGINE.md: interprets Metrics Engine output in
// context -- trends, evolution, plateaus, and comparisons between training
// blocks or seasons. Every function here consumes MetricSeriesPoint[],
// the Metrics Engine's own output shape; nothing in this directory
// imports from engines/activity/, so it's structurally impossible for
// these functions to read raw Activity/Lap/Record data directly.
//
// Deliberately excludes recommendations: generating those is the Coach
// Engine's responsibility (per the spec's DEC-0006: "Recommendations ->
// Coach Engine"). Every Insight produced here has recommendation: null.

export * from "./types";
export * from "./trend";
export * from "./evolution";
export * from "./plateau";
export * from "./periodComparison";
export * from "./persistence";
