import type { WeeklyCoachReport, WeeklyReportInput } from "../types/weeklyReport";

const GOOD_CONSISTENCY_RATIO = 0.85;
const LOW_CONSISTENCY_RATIO = 0.6;
const ELEVATED_FATIGUE_TSB = -20;

/**
 * Weekly Coach Report, per this task's 6 explicit requested sections:
 * "resumo da semana" (summary), "evolução" (evolution), "pontos fortes"
 * (strengths), "pontos fracos" (weaknesses), "recomendações"
 * (recommendations, passed through from the caller -- this generator
 * never creates new ones), "prioridades da próxima semana"
 * (nextWeekPriorities). Purely a deterministic composition of the
 * already-computed weekly aggregate signals it's handed.
 */
export function generateWeeklyReport(input: WeeklyReportInput, generatedAt: string): WeeklyCoachReport {
  const { weekStart, weekEnd, sessionsCompleted, sessionsPlanned, totalDistanceKm, ctlChange, atlChange, averageTsb, consistencyRatio, keyInsightSummaries, recommendations, newPersonalBests } = input;

  const evolution: string[] = [`Completed ${sessionsCompleted} session${sessionsCompleted === 1 ? "" : "s"} covering ${totalDistanceKm.toFixed(1)}km.`];
  if (ctlChange != null) evolution.push(`Fitness (CTL) ${ctlChange >= 0 ? "increased" : "decreased"} by ${Math.abs(ctlChange).toFixed(1)}.`);
  if (atlChange != null) evolution.push(`Fatigue (ATL) ${atlChange >= 0 ? "increased" : "decreased"} by ${Math.abs(atlChange).toFixed(1)}.`);
  if (averageTsb != null) evolution.push(`Average Training Stress Balance was ${averageTsb.toFixed(1)}.`);
  evolution.push(...keyInsightSummaries);

  const strengths: string[] = [];
  if (ctlChange != null && ctlChange > 0) strengths.push(`Fitness (CTL) grew by ${ctlChange.toFixed(1)} this week.`);
  if (consistencyRatio != null && consistencyRatio >= GOOD_CONSISTENCY_RATIO) strengths.push(`Excellent consistency: ${(consistencyRatio * 100).toFixed(0)}% of planned sessions completed.`);
  if (newPersonalBests.length > 0) strengths.push(...newPersonalBests.map((pb) => `New personal best: ${pb}.`));

  const weaknesses: string[] = [];
  if (ctlChange != null && ctlChange < 0) weaknesses.push(`Fitness (CTL) declined by ${Math.abs(ctlChange).toFixed(1)} this week.`);
  if (consistencyRatio != null && consistencyRatio < LOW_CONSISTENCY_RATIO) {
    const plannedNote = sessionsPlanned != null ? ` (${sessionsCompleted} of ${sessionsPlanned} planned sessions)` : "";
    weaknesses.push(`Consistency was low: ${(consistencyRatio * 100).toFixed(0)}% of planned sessions completed${plannedNote}.`);
  }
  if (averageTsb != null && averageTsb < ELEVATED_FATIGUE_TSB) weaknesses.push(`Fatigue was elevated for most of the week (average TSB ${averageTsb.toFixed(1)}).`);

  const nextWeekPriorities: string[] = [];
  if (averageTsb != null && averageTsb < ELEVATED_FATIGUE_TSB) nextWeekPriorities.push("Prioritize recovery before resuming quality sessions.");
  if (consistencyRatio != null && consistencyRatio < LOW_CONSISTENCY_RATIO) nextWeekPriorities.push("Rebuild consistency with a realistic, achievable session count.");
  if (ctlChange != null && ctlChange > 0 && (averageTsb == null || averageTsb >= ELEVATED_FATIGUE_TSB)) nextWeekPriorities.push("Continue the current training progression.");
  const topRecommendationTitles = recommendations
    .filter((r) => r.priority <= 2)
    .slice(0, 2)
    .map((r) => r.title);
  nextWeekPriorities.push(...topRecommendationTitles.filter((t) => !nextWeekPriorities.includes(t)));
  if (nextWeekPriorities.length === 0) nextWeekPriorities.push("Maintain the current balance of load and recovery.");

  const summary =
    weaknesses.length > 0
      ? `This week had ${weaknesses.length} point${weaknesses.length === 1 ? "" : "s"} worth addressing: ${weaknesses[0]}`
      : `A solid week: ${sessionsCompleted} sessions, ${totalDistanceKm.toFixed(1)}km, with no significant concerns.`;

  return {
    weekStart,
    weekEnd,
    summary,
    evolution,
    strengths,
    weaknesses,
    recommendations,
    nextWeekPriorities,
    generatedAt,
  };
}
