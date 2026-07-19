import type { Alert } from "./alert";
import type { Recommendation } from "./recommendation";
import type { TrainingDecision } from "./trainingDecision";

/**
 * Daily Brief Generator's output. Per this task's explicit 4 requested
 * sections: "resumo diário" (summary), "principais mudanças" (keyChanges),
 * "pontos de atenção" (attentionPoints), "evolução recente"
 * (recentEvolution) -- plus the training decision, recommendations and
 * alerts that back them up.
 */
export interface DailyBriefSummary {
  date: string; // YYYY-MM-DD
  summary: string;
  keyChanges: string[];
  attentionPoints: string[];
  recentEvolution: string[];
  trainingDecision: TrainingDecision;
  recommendations: Recommendation[];
  alerts: Alert[];
  raceCountdown: { raceName: string; daysUntil: number } | null;
  /** 0-1. */
  confidenceLevel: number;
}
