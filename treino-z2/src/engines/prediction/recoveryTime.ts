import { ATL_TIME_CONSTANT_DAYS, metricResult, unavailableMetric, type MetricResult } from "../metrics";

export interface RecoveryTimePrediction {
  daysUntilRecovered: number;
  assumedRestTss: number;
}

/**
 * Predicts days until an athlete recovers (TSB returns to neutral, i.e.
 * ATL drops back to/below CTL), assuming complete rest (TSS = 0) from
 * today onward. Solved analytically from the Metrics Engine's own ATL
 * decay model (calculateTrainingLoadSeries: atl += (tss - atl) / 7): with
 * tss = 0 every day, atl decays geometrically as
 * atl(n) = atl0 * (1 - 1/7)^n. Setting atl(n) <= ctl and solving for n
 * gives n = ceil(ln(ctl / atl0) / ln(1 - 1/7)). CTL is assumed roughly
 * constant over the (typically short) recovery window, since it decays
 * far more slowly than ATL.
 */
export function predictRecoveryTime(ctl: number, atl: number): MetricResult<RecoveryTimePrediction> {
  const requiredInputs = ["ctl", "atl"];
  if (ctl <= 0 || atl <= 0) {
    return unavailableMetric(requiredInputs, ["ctl and atl must be positive"]);
  }

  if (atl <= ctl) {
    return metricResult({ daysUntilRecovered: 0, assumedRestTss: 0 }, 0.8, "high", requiredInputs);
  }

  const decayFactor = 1 - 1 / ATL_TIME_CONSTANT_DAYS; // 6/7
  const daysUntilRecovered = Math.ceil(Math.log(ctl / atl) / Math.log(decayFactor));

  const dataQuality: "high" | "medium" | "low" = daysUntilRecovered <= 14 ? "medium" : "low";
  const confidence = daysUntilRecovered <= 14 ? 0.65 : 0.4;

  return metricResult({ daysUntilRecovered, assumedRestTss: 0 }, confidence, dataQuality, requiredInputs, [
    "assumes complete rest (TSS = 0) every day until recovered; CTL is assumed roughly constant over the projection window",
  ]);
}
