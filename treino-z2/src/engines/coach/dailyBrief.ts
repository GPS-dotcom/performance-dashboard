import { detectAlerts } from "./alerts";
import type { AlertSignals } from "./alerts";
import { recommendTraining } from "./trainingRecommendation";
import type { CoachAlert, Recommendation, TrainingSignals } from "./types";

export interface DailyBriefInput {
  date: string; // YYYY-MM-DD
  recoveryScore: number | null;
  fitnessScore: number | null;
  trainingSignals: TrainingSignals;
  alertSignals: AlertSignals;
  /** Short summaries (e.g. Insight.description) from the Intelligence Engine, pre-selected by the caller. */
  keyInsightSummaries: string[];
  upcomingRace: { name: string; date: string } | null;
}

export interface DailyBrief {
  date: string;
  status: string;
  recovery: { score: number | null; label: string };
  fitness: { score: number | null; label: string };
  trainingRecommendation: Recommendation;
  keyInsights: string[];
  raceCountdown: { raceName: string; daysUntil: number } | null;
  warnings: CoachAlert[];
  opportunities: string[];
  confidenceLevel: number;
}

function scoreLabel(score: number | null): string {
  if (score == null) return "unknown";
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "low";
}

function daysUntil(targetDateStr: string, fromDateStr: string): number {
  const target = new Date(`${targetDateStr}T00:00:00Z`).getTime();
  const from = new Date(`${fromDateStr}T00:00:00Z`).getTime();
  return Math.round((target - from) / 86400000);
}

/**
 * "Daily Brief" (COACH_ENGINE.md p.48): "The primary output of the Coach
 * Engine. It must include: Today's Status, Recovery, Fitness, Training
 * Recommendation, Key Insights, Race Countdown, Warnings, Opportunities,
 * Confidence Level." Purely an aggregation of the other Coach Engine
 * functions (recommendTraining, detectAlerts) plus already-computed
 * Metrics/Intelligence/Prediction outputs -- calculates nothing new.
 */
export function generateDailyBrief(input: DailyBriefInput): DailyBrief {
  const { date, recoveryScore, fitnessScore, trainingSignals, alertSignals, keyInsightSummaries, upcomingRace } = input;

  const warnings = detectAlerts(alertSignals);
  const trainingRecommendation = recommendTraining(trainingSignals);

  const opportunities: string[] = [];
  if (trainingSignals.lt1Trend === "increasing") {
    opportunities.push("LT1 is trending upward -- aerobic fitness is improving.");
  }
  if (trainingSignals.hrDriftTrend === "decreasing") {
    opportunities.push("HR Drift is improving -- aerobic efficiency is trending in the right direction.");
  }
  if (recoveryScore != null && recoveryScore >= 80) {
    opportunities.push("Recovery capacity is high -- a good window for a quality session.");
  }

  const hasCriticalWarning = warnings.some((w) => w.severity === "critical");
  const status = hasCriticalWarning
    ? `Status: attention needed -- ${warnings.find((w) => w.severity === "critical")!.message}`
    : `Recovery is ${scoreLabel(recoveryScore)}, fitness is ${scoreLabel(fitnessScore)}. Today's recommendation: ${trainingRecommendation.recommendation}.`;

  const raceCountdown = upcomingRace ? { raceName: upcomingRace.name, daysUntil: daysUntil(upcomingRace.date, date) } : null;

  // Overall confidence: the training recommendation's own confidence, pulled down when
  // a critical warning is active -- the brief is less "settled" when something needs attention.
  const confidenceLevel = hasCriticalWarning
    ? Math.min(trainingRecommendation.confidence, 0.6)
    : trainingRecommendation.confidence;

  return {
    date,
    status,
    recovery: { score: recoveryScore, label: scoreLabel(recoveryScore) },
    fitness: { score: fitnessScore, label: scoreLabel(fitnessScore) },
    trainingRecommendation,
    keyInsights: keyInsightSummaries,
    raceCountdown,
    warnings,
    opportunities,
    confidenceLevel,
  };
}
