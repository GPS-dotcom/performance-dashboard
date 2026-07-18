import { metricResult, unavailableMetric, type MetricResult } from "../metrics";

export interface InjuryRiskPrediction {
  acwr: number;
  riskLevel: "low" | "moderate" | "high";
  riskScore: number; // 0-100
}

// Acute:Chronic Workload Ratio (ACWR) -- Gabbett, T.J. (2016), "The
// training-injury prevention paradox: should athletes be training smarter
// and harder?", British Journal of Sports Medicine 50(5). ACWR = ATL
// (7-day acute load, from the Metrics Engine's own CTL/ATL/TSB model) /
// CTL (42-day chronic load). The widely cited "sweet spot" is roughly
// 0.8-1.3; ACWR above ~1.5 ("the danger zone") is associated with
// substantially elevated injury risk in the sports-science literature.
const ACWR_LOW_RISK_MIN = 0.8;
const ACWR_LOW_RISK_MAX = 1.3;
const ACWR_HIGH_RISK_THRESHOLD = 1.5;

/**
 * Predicts injury risk from the Acute:Chronic Workload Ratio. This is a
 * single-signal heuristic (deliberately fixed, moderate confidence) --
 * real injury risk also depends on signals this system doesn't collect
 * yet (HRV, sleep, prior injury history, subjective wellness), which are
 * surfaced via missingInputs rather than silently ignored.
 */
export function predictInjuryRisk(ctl: number, atl: number): MetricResult<InjuryRiskPrediction> {
  const requiredInputs = ["ctl (chronic training load)", "atl (acute training load)"];
  if (ctl <= 0) {
    return unavailableMetric(requiredInputs, ["ctl must be positive to compute ACWR"]);
  }

  const acwr = atl / ctl;

  let riskLevel: "low" | "moderate" | "high";
  let riskScore: number;
  if (acwr >= ACWR_LOW_RISK_MIN && acwr <= ACWR_LOW_RISK_MAX) {
    riskLevel = "low";
    riskScore = 20;
  } else if (acwr > ACWR_HIGH_RISK_THRESHOLD) {
    riskLevel = "high";
    riskScore = Math.min(100, 70 + (acwr - ACWR_HIGH_RISK_THRESHOLD) * 40);
  } else {
    riskLevel = "moderate";
    riskScore = 45;
  }

  return metricResult({ acwr, riskLevel, riskScore }, 0.7, "medium", requiredInputs, [
    "additional signals (HRV, sleep, prior injury history, subjective wellness) would improve this estimate",
  ]);
}
