import { detectAlerts } from "../alerts/alertEngine";
import { decideTrainingAction } from "../decision-engine/trainingDecisionEngine";
import { generateIntensityRecommendation } from "../recommendations/intensityRecommendations";
import { generateRecoveryRecommendations } from "../recommendations/recoveryRecommendations";
import type { DailyBriefSummary } from "../types/dailyBrief";
import type { AlertSignals, RecoverySignals, TrainingSignals } from "../types/signals";

export interface DailyBriefGeneratorInput {
  date: string; // YYYY-MM-DD
  recoveryScore: number | null;
  fitnessScore: number | null;
  trainingSignals: TrainingSignals;
  recoverySignals: RecoverySignals;
  alertSignals: AlertSignals;
  /** Short summaries (Insight.description) from the Intelligence Engine, pre-selected by the caller. */
  keyInsightSummaries: string[];
  upcomingRace: { name: string; date: string } | null;
}

/** Categorizes a 0-100 score into a coaching-facing label -- exported so callers (e.g. the Daily Brief view model) can label Recovery/Fitness scores the same way this generator does, without re-deriving the bands. */
export function scoreLabel(score: number | null): string {
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

function describeChange(label: string, direction: TrainingSignals["recoveryScoreTrend"]): string | null {
  if (direction === "increasing") return `${label} increased.`;
  if (direction === "decreasing") return `${label} decreased.`;
  return null; // "stable" and null are not changes worth reporting
}

/**
 * Daily Brief Generator, per this task's 4 explicit requested sections:
 * "resumo diário" (summary), "principais mudanças" (keyChanges), "pontos
 * de atenção" (attentionPoints), "evolução recente" (recentEvolution).
 * Purely an aggregation of the Training Decision Engine, Alert Engine and
 * the Intensity/Recovery Recommendation generators, plus already-computed
 * Metrics/Intelligence/Prediction outputs -- calculates nothing new.
 */
export function generateDailyBrief(input: DailyBriefGeneratorInput): DailyBriefSummary {
  const { date, recoveryScore, fitnessScore, trainingSignals, recoverySignals, alertSignals, keyInsightSummaries, upcomingRace } = input;

  const alerts = detectAlerts(alertSignals, date);
  const trainingDecision = decideTrainingAction(trainingSignals, date);
  const intensityRecommendation = generateIntensityRecommendation(trainingSignals, date);
  const recoveryRecommendations = generateRecoveryRecommendations(recoverySignals, date);
  const recommendations = [intensityRecommendation, ...recoveryRecommendations];

  const keyChanges = [
    describeChange("Recovery Score", trainingSignals.recoveryScoreTrend),
    describeChange("Fatigue (ATL)", trainingSignals.atlTrend),
    describeChange("HR Drift", trainingSignals.hrDriftTrend),
    describeChange("LT1", trainingSignals.lt1Trend),
  ].filter((c): c is string => c != null);

  const attentionPoints = [
    ...alerts.filter((a) => a.severity !== "info").map((a) => a.description),
    ...recommendations.filter((r) => r.priority === 1).map((r) => r.description),
  ];

  const recentEvolution = [`Recovery is ${scoreLabel(recoveryScore)}.`, `Fitness is ${scoreLabel(fitnessScore)}.`, ...keyInsightSummaries];

  const hasCriticalAlert = alerts.some((a) => a.severity === "critical");
  const summary = hasCriticalAlert
    ? `Status: attention needed -- ${alerts.find((a) => a.severity === "critical")!.description}`
    : `Recovery is ${scoreLabel(recoveryScore)}, fitness is ${scoreLabel(fitnessScore)}. Today's decision: ${trainingDecision.action.replace(/_/g, " ")} (${intensityRecommendation.title}).`;

  const raceCountdown = upcomingRace ? { raceName: upcomingRace.name, daysUntil: daysUntil(upcomingRace.date, date) } : null;

  // Overall confidence: the training decision's own confidence, pulled down when
  // a critical alert is active -- the brief is less "settled" when something needs attention.
  const confidenceLevel = hasCriticalAlert ? Math.min(trainingDecision.confidence, 0.6) : trainingDecision.confidence;

  return {
    date,
    summary,
    keyChanges,
    attentionPoints,
    recentEvolution,
    trainingDecision,
    recommendations,
    alerts,
    raceCountdown,
    confidenceLevel,
  };
}
