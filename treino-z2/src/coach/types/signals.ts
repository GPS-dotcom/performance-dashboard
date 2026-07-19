// Every signal type below is data this engine *reads*, never computes --
// per docs/ARCHITECTURE.md's guiding principle ("engines communicate
// through contracts, never direct dependencies") this module only
// depends on plain value types (numbers, strings, booleans), never a
// calculation/prediction/analysis function from ../metrics, ../prediction
// or ../intelligence.

export type TrendDirection = "increasing" | "decreasing" | "stable";
export type RiskLevel = "low" | "moderate" | "high";

/** Signals the Training Decision Engine / Intensity Recommendation read to decide today's training. */
export interface TrainingSignals {
  recoveryScore: number | null; // 0-100, from Metrics Engine's calculateRecoveryScore
  recoveryScoreTrend: TrendDirection | null; // from an Intelligence Engine Insight
  atlTrend: TrendDirection | null; // rising ATL = more fatigue
  hrDriftTrend: TrendDirection | null; // rising = worse cardiac decoupling
  lt1Trend: TrendDirection | null; // rising pace/power at LT1 = improving aerobic fitness
  tsb: number | null;
  injuryRiskLevel: RiskLevel | null; // from Prediction Engine's injury risk prediction
}

/** Signals the Recovery Recommendation reads. */
export interface RecoverySignals {
  recoveryScore: number | null; // 0-100, from Metrics Engine
  acwr: number | null; // Acute:Chronic Workload Ratio, from Prediction Engine's injury risk prediction
  hrDriftTrend: TrendDirection | null; // from an Intelligence Engine Insight
  hasWearableRecoveryData: boolean; // whether sleep/HRV are actually being tracked for this athlete
}

/** Signals the Volume Recommendation reads. */
export interface VolumeSignals {
  acwr: number | null;
  weeklyDistanceKm: number | null;
  weeklyDistanceTrend: TrendDirection | null; // from an Intelligence Engine Insight
  consistencyRatio: number | null; // 0-1, completed vs. planned sessions or active vs. total weeks
}

/** Signals the Nutrition Recommendation reads. */
export interface NutritionSignals {
  athleteWeightKg: number | null;
  todaySessionLoad: "rest" | "light" | "moderate" | "heavy" | "extreme";
}

/** Signals the Hydration Recommendation reads. */
export interface HydrationSignals {
  athleteWeightKg: number | null;
  todaySessionDurationMin: number | null;
  isHotCondition: boolean;
}

/** Signals the Alert Engine reads. */
export interface AlertSignals {
  injuryRiskLevel: RiskLevel | null; // from Prediction Engine's injury risk prediction
  tsb: number | null;
  recoveryScore: number | null; // 0-100, from Metrics Engine
  acwr: number | null; // from Prediction Engine's injury risk prediction
  performanceTrendDeclining: boolean; // a high-confidence declining trend Insight from the Intelligence Engine
  consistencyDeclining: boolean; // a "Reduced Consistency" Insight from the Intelligence Engine
  missedWeeksEvidence: string | null; // evidence text carried through from that Insight, when consistencyDeclining is true
  newPersonalBest: { distanceLabel: string; timeSec: number } | null; // from the Intelligence Engine's Performance Analyzer
}
