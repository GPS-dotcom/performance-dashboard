import type { Activity } from "../../types";
import type { MetricSeriesPoint } from "./metricSeries";

/** One calendar week's training summary -- consistencyAnalyzer's input, derived from Activity[] by the caller. */
export interface WeeklyTrainingSummary {
  weekStart: string; // YYYY-MM-DD, Monday
  sessionsCompleted: number;
  distanceKm: number;
  durationS: number;
}

/** A named span of time with the series/activities that fall inside it (a block, a season, a cycle). */
export interface NamedPeriod {
  label: string;
  series: MetricSeriesPoint[];
}

/** trainingBlockAnalyzer's richer input: a period plus the raw activities and recovery data inside it. */
export interface TrainingBlockSummary {
  label: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
  ctlSeries: MetricSeriesPoint[];
  recoveryScoreSeries: MetricSeriesPoint[];
}

/** Only the fields shoeAnalyzer needs, plus the `shoe` identifier the app-wide Activity type doesn't carry. */
export interface ActivityWithShoe {
  id: string | number;
  startDate: string;
  distanceM: number | null;
  movingTimeS: number | null;
  averageWatts: number | null;
  bestEfforts: Record<string, number> | null;
  shoe: string | null;
}
