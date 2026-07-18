import { buildInsight } from "../insights/insightBuilder";
import { accumulatedFatigueTemplate, excessLoadTemplate, insufficientRecoveryTemplate } from "../insights/insightTemplates";
import {
  ACCUMULATED_FATIGUE_MIN_CONSECUTIVE_DAYS,
  ACCUMULATED_FATIGUE_TSB_THRESHOLD,
  CRITICAL_FATIGUE_TSB_THRESHOLD,
  EXCESS_LOAD_WEEK_OVER_WEEK_INCREASE,
} from "../rules/fatigueRules";
import type { TrainingLoadPoint } from "../../metrics";
import type { Insight } from "../types/insight";

/**
 * Fatigue Analyzer (08_INTELLIGENCE_ENGINE.md: "Evaluate ... Fatigue").
 * Reads the *load* side of the Metrics Engine's TrainingLoadPoint series
 * (ATL/TSB) -- distinct from recoveryAnalyzer, which reads the Recovery
 * Score itself. Never recomputes ATL/TSB/CTL: those numbers come in
 * already calculated.
 */

/** "fadiga acumulada": TSB has been at/below the threshold for several consecutive days. */
export function analyzeAccumulatedFatigue(series: TrainingLoadPoint[], date: string): Insight | null {
  if (series.length === 0) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  let consecutiveDays = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].tsb <= ACCUMULATED_FATIGUE_TSB_THRESHOLD) consecutiveDays++;
    else break;
  }

  if (consecutiveDays < ACCUMULATED_FATIGUE_MIN_CONSECUTIVE_DAYS) return null;

  const latest = sorted[sorted.length - 1];
  const t = accumulatedFatigueTemplate(latest.tsb, consecutiveDays);
  return buildInsight({
    kind: "fatigue_accumulated",
    category: "recovery",
    severity: latest.tsb <= CRITICAL_FATIGUE_TSB_THRESHOLD ? "critical" : "warning",
    title: t.title,
    description: t.description,
    evidence: [`TSB ${latest.tsb.toFixed(1)}, at/below ${ACCUMULATED_FATIGUE_TSB_THRESHOLD} for ${consecutiveDays} consecutive days`],
    confidence: Math.min(1, consecutiveDays / (ACCUMULATED_FATIGUE_MIN_CONSECUTIVE_DAYS * 2)),
    relatedMetrics: ["tsb"],
    date,
  });
}

/** "recuperação insuficiente": TSB has stayed negative without recovering (non-positive slope) over the recent window. */
export function analyzeInsufficientRecovery(series: TrainingLoadPoint[], windowDays: number, date: string): Insight | null {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-windowDays);
  if (window.length < windowDays) return null;

  const allNegative = window.every((p) => p.tsb < 0);
  if (!allNegative) return null;

  const first = window[0].tsb;
  const last = window[window.length - 1].tsb;
  const recovering = last > first;
  if (recovering) return null;

  const t = insufficientRecoveryTemplate(last, window.length);
  return buildInsight({
    kind: "fatigue_insufficient_recovery",
    category: "recovery",
    severity: "warning",
    title: t.title,
    description: t.description,
    evidence: [`TSB stayed negative for all ${window.length} days (${first.toFixed(1)} -> ${last.toFixed(1)})`],
    confidence: Math.min(1, window.length / 14),
    relatedMetrics: ["tsb"],
    date,
  });
}

/** "excesso de carga": acute (ATL) load spiked week-over-week. */
export function analyzeExcessLoad(series: TrainingLoadPoint[], date: string): Insight | null {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 14) return null;

  const recentWeek = sorted.slice(-7);
  const priorWeek = sorted.slice(-14, -7);
  const recentAvgAtl = recentWeek.reduce((s, p) => s + p.atl, 0) / recentWeek.length;
  const priorAvgAtl = priorWeek.reduce((s, p) => s + p.atl, 0) / priorWeek.length;
  if (priorAvgAtl === 0) return null;

  const increase = (recentAvgAtl - priorAvgAtl) / priorAvgAtl;
  if (increase < EXCESS_LOAD_WEEK_OVER_WEEK_INCREASE) return null;

  const t = excessLoadTemplate(increase * 100);
  return buildInsight({
    kind: "fatigue_excess_load",
    category: "training_load",
    severity: "warning",
    title: t.title,
    description: t.description,
    evidence: [`ATL averaged ${priorAvgAtl.toFixed(1)} last week vs. ${recentAvgAtl.toFixed(1)} this week`],
    confidence: 0.75,
    relatedMetrics: ["atl"],
    date,
  });
}
