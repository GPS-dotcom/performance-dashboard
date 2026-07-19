import type { Recommendation } from "./recommendation";

/**
 * Weekly Coach Report's output: "resumo da semana, evolução, pontos
 * fortes, pontos fracos, recomendações, prioridades da próxima semana."
 */
export interface WeeklyCoachReport {
  weekStart: string; // YYYY-MM-DD, Monday
  weekEnd: string; // YYYY-MM-DD, Sunday
  summary: string;
  evolution: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  nextWeekPriorities: string[];
  generatedAt: string;
}

/** Aggregated inputs the Weekly Coach Report is built from -- already-computed data, assembled by the caller from a week's worth of Metrics/Intelligence/Prediction Engine output. */
export interface WeeklyReportInput {
  weekStart: string;
  weekEnd: string;
  sessionsCompleted: number;
  sessionsPlanned: number | null;
  totalDistanceKm: number;
  ctlChange: number | null; // ctl at week end minus ctl at week start
  atlChange: number | null;
  averageTsb: number | null;
  /** 0-1: sessionsCompleted / sessionsPlanned, or active-days-based when no plan exists. */
  consistencyRatio: number | null;
  keyInsightSummaries: string[];
  recommendations: Recommendation[];
  newPersonalBests: string[];
}
