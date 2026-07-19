import { generateWeeklyReport } from "../../coach";
import type { Recommendation, WeeklyCoachReport } from "../../coach";
import type { Activity, MetricsSnapshot } from "../../types";

function isoWeekBounds(today: string): { weekStart: string; weekEndExclusive: string } {
  const d = new Date(`${today}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() + diff);
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(start.getUTCDate() + 7);
  return { weekStart: start.toISOString().slice(0, 10), weekEndExclusive: endExclusive.toISOString().slice(0, 10) };
}

/**
 * Assembles this week's WeeklyReportInput from already-fetched activities
 * and metrics history, then hands it to the Coach Engine's own
 * generateWeeklyReport -- the same "aggregate real data, then call the
 * engine's generator" pattern hooks/assembleDailyBrief.ts already
 * established for the Home page's Daily Brief. `recommendations` and
 * `newPersonalBests` are passed through empty here: they come from this
 * week's Coach Engine / Intelligence Engine runs, which this Dashboard
 * phase does not schedule (no cron/edge function persists them yet -- see
 * DASHBOARD_REPORT.md's Limitations); the report still reflects real
 * session counts, distance and CTL/ATL/TSB movement either way.
 */
export function assembleWeeklyReport(activities: Activity[], metricsHistory: MetricsSnapshot[], recommendations: Recommendation[], today: string): WeeklyCoachReport | null {
  const { weekStart, weekEndExclusive } = isoWeekBounds(today);
  const weekActivities = activities.filter((a) => a.startDate >= weekStart && a.startDate < weekEndExclusive);
  const weekSnapshots = metricsHistory.filter((m) => m.date >= weekStart && m.date < weekEndExclusive);

  if (weekSnapshots.length === 0 && weekActivities.length === 0) return null;

  const distanceKm = weekActivities.reduce((sum, a) => sum + (a.distanceM ?? 0) / 1000, 0);
  const first = weekSnapshots[0] ?? null;
  const last = weekSnapshots[weekSnapshots.length - 1] ?? null;
  const averageTsb = weekSnapshots.length > 0 ? weekSnapshots.reduce((sum, m) => sum + m.tsb, 0) / weekSnapshots.length : null;

  return generateWeeklyReport(
    {
      weekStart,
      weekEnd: weekEndExclusive,
      sessionsCompleted: weekActivities.length,
      sessionsPlanned: null, // no training plan module exists yet (see docs/ARCHITECTURE.md's known gaps)
      totalDistanceKm: distanceKm,
      ctlChange: first && last ? last.ctl - first.ctl : null,
      atlChange: first && last ? last.atl - first.atl : null,
      averageTsb,
      consistencyRatio: null, // requires sessionsPlanned, which isn't tracked yet
      keyInsightSummaries: [],
      recommendations,
      newPersonalBests: [],
    },
    today,
  );
}
