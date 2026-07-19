import { extractBestEfforts } from "../../hooks/assembleDailyBrief";
import { predictAcuteLoadRisk, predictCtlEvolution, predictRace10K, predictRace21K, predictRace5K, predictRaceMarathon, predictRecoveryTime } from "../../prediction";
import type { AcuteLoadRiskValue, Prediction, RaceModelValue, RecoveryModelValue, TrendModelValue } from "../../prediction";
import type { Activity, MetricsSnapshot } from "../../types";

export interface PredictionsViewModel {
  racePredictions: { label: string; result: Prediction<RaceModelValue> }[];
  fitnessEvolution: Prediction<TrendModelValue> | null;
  recoveryTime: Prediction<RecoveryModelValue> | null;
  injuryRisk: Prediction<AcuteLoadRiskValue> | null;
}

const FITNESS_FORECAST_DAYS_AHEAD = 30;

/**
 * Assembles the Predictions page's view model. Every value here is a
 * Prediction Engine output, either reused unchanged from what the Daily
 * Brief already computes (race times, recovery time, injury risk) or a
 * Prediction Engine call this page adds on its own (CTL/fitness
 * evolution, "evolução do fitness"). FTP evolution and goal-achievement
 * probability are deliberately not included here -- see
 * DASHBOARD_REPORT.md's Limitations: FTP evolution needs a persisted FTP
 * history the schema doesn't have yet (only a single current `athletes.ftp`
 * value), and goal-achievement needs a numeric target value the `goals`
 * table doesn't store yet (only `target_date`). Both require schema work
 * the Dashboard phase is not scoped to do.
 */
export function assemblePredictionsView(activities: Activity[], metricsHistory: MetricsSnapshot[], today: string): PredictionsViewModel {
  const bestEfforts = extractBestEfforts(activities);
  const racePredictions = [
    { label: "5K", result: predictRace5K(bestEfforts, today) },
    { label: "10K", result: predictRace10K(bestEfforts, today) },
    { label: "Half Marathon", result: predictRace21K(bestEfforts, today) },
    { label: "Marathon", result: predictRaceMarathon(bestEfforts, today) },
  ];

  const latest = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1] : null;
  const ctlSeries = metricsHistory.map((m) => ({ date: m.date, value: m.ctl }));

  const fitnessEvolution = ctlSeries.length >= 2 ? predictCtlEvolution(ctlSeries, FITNESS_FORECAST_DAYS_AHEAD, today) : null;
  const recoveryTime = latest ? predictRecoveryTime(latest.ctl, latest.atl, today) : null;
  const injuryRisk = latest ? predictAcuteLoadRisk(latest.ctl, latest.atl, today) : null;

  return { racePredictions, fitnessEvolution, recoveryTime, injuryRisk };
}
