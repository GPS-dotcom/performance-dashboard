import { analyzeWeeklyLoad, calculatePaceZones, calculatePowerZones } from "../../metrics";
import type { WeeklyLoadSummary, ZoneTable } from "../../metrics";
import type { Activity, MetricsSnapshot, ZoneKey } from "../../types";
import type { AthleteProfile } from "../services/athleteProfileService";

export interface MetricsViewModel {
  dates: string[];
  ctlValues: number[];
  atlValues: number[];
  tsbValues: number[];
  latest: MetricsSnapshot | null;
  thisWeek: WeeklyLoadSummary;
  zoneMinutesTotals: Record<ZoneKey, number>;
  powerZones: ZoneTable | null;
  paceZones: ZoneTable | null;
}

const ZONE_KEYS: ZoneKey[] = ["Z1", "Z2", "Z3", "Z4", "Z5"];

function startOfIsoWeek(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Assembles the Metrics page's view model: CTL/ATL/TSB history (already
 * computed, read straight from `metricsHistory`), this week's load totals
 * (Metrics Engine's own analyzeWeeklyLoad, not re-derived here), and
 * Power/Pace zone tables from the athlete's stored FTP / threshold pace
 * (Metrics Engine's own calculators). No physiological metric is
 * calculated in this file -- every number either passes through
 * unchanged or comes back from a Metrics Engine function.
 */
export function assembleMetricsView(activities: Activity[], metricsHistory: MetricsSnapshot[], athlete: AthleteProfile | null, today: string): MetricsViewModel {
  const dates = metricsHistory.map((m) => m.date);
  const ctlValues = metricsHistory.map((m) => m.ctl);
  const atlValues = metricsHistory.map((m) => m.atl);
  const tsbValues = metricsHistory.map((m) => m.tsb);
  const latest = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1] : null;

  const weekStart = startOfIsoWeek(today);
  const weekEndExclusive = addDaysIso(weekStart, 7);
  const thisWeek = analyzeWeeklyLoad(activities, weekStart, weekEndExclusive);

  const zoneMinutesTotals = ZONE_KEYS.reduce(
    (totals, zone) => {
      totals[zone] = activities.reduce((sum, a) => sum + (a.zoneMinutes?.[zone] ?? 0), 0);
      return totals;
    },
    {} as Record<ZoneKey, number>,
  );

  const powerZones = athlete?.ftp != null ? calculatePowerZones(athlete.ftp).value : null;
  const paceZones = athlete?.thresholdPaceSecPerKm != null ? calculatePaceZones(athlete.thresholdPaceSecPerKm).value : null;

  return { dates, ctlValues, atlValues, tsbValues, latest, thisWeek, zoneMinutesTotals, powerZones, paceZones };
}
