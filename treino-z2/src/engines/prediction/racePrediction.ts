import { metricResult, unavailableMetric, type MetricResult } from "../metrics";
import type { BestEffort } from "./types";

export const RACE_DISTANCES_KM = {
  fiveK: 5,
  tenK: 10,
  halfMarathon: 21.0975,
  marathon: 42.195,
} as const;

export interface RacePrediction {
  targetDistanceKm: number;
  predictedTimeSec: number;
  method: "actual_best_effort" | "riegel_extrapolation";
  anchorDistanceKm: number | null;
  anchorTimeSec: number | null;
}

// Riegel's formula (Riegel, P.S. 1977, "Athletic Records and Human
// Endurance", American Scientist 65(4)): T2 = T1 * (D2/D1)^k. The
// exponent 1.06 is Riegel's empirically fitted value, and remains the
// most widely used simple race-time extrapolation formula in distance
// running.
const RIEGEL_EXPONENT = 1.06;
const EXACT_MATCH_TOLERANCE_KM = 0.05;
// Confidence decays exponentially with how far (in log-distance) the
// extrapolation reaches -- Riegel's formula is most accurate when the
// anchor and target distances are close; a 5K -> marathon extrapolation
// is far less reliable than a half -> marathon one.
const CONFIDENCE_DECAY_RATE = 0.5;

/**
 * Predicts a race time at `targetDistanceKm`. Uses a real recorded best
 * effort directly if one exists close to the target distance; otherwise
 * extrapolates via Riegel's formula from whichever available best effort
 * is closest in log-distance to the target (log-distance ratio treats
 * "2x longer" and "2x shorter" symmetrically, and is what the confidence
 * decay below is based on).
 */
export function predictRaceTime(targetDistanceKm: number, bestEfforts: BestEffort[]): MetricResult<RacePrediction> {
  const requiredInputs = ["best efforts (distanceKm, timeSec) at >= 1 distance"];
  if (bestEfforts.length === 0) {
    return unavailableMetric(requiredInputs, ["no best efforts available"]);
  }

  const exact = bestEfforts.find((e) => Math.abs(e.distanceKm - targetDistanceKm) <= EXACT_MATCH_TOLERANCE_KM);
  if (exact) {
    return metricResult(
      {
        targetDistanceKm,
        predictedTimeSec: exact.timeSec,
        method: "actual_best_effort",
        anchorDistanceKm: exact.distanceKm,
        anchorTimeSec: exact.timeSec,
      },
      0.95,
      "high",
      requiredInputs,
    );
  }

  let anchor: BestEffort | null = null;
  let bestLogRatio = Infinity;
  for (const effort of bestEfforts) {
    if (effort.distanceKm <= 0) continue;
    const logRatio = Math.abs(Math.log(targetDistanceKm / effort.distanceKm));
    if (logRatio < bestLogRatio) {
      bestLogRatio = logRatio;
      anchor = effort;
    }
  }
  if (!anchor) return unavailableMetric(requiredInputs, ["no usable anchor distance"]);

  const predictedTimeSec = anchor.timeSec * Math.pow(targetDistanceKm / anchor.distanceKm, RIEGEL_EXPONENT);
  const confidence = Math.max(0.05, Math.min(0.9, 0.9 * Math.exp(-CONFIDENCE_DECAY_RATE * bestLogRatio)));
  const dataQuality: "high" | "medium" | "low" = bestLogRatio < 0.5 ? "high" : bestLogRatio < 1.2 ? "medium" : "low";

  return metricResult(
    {
      targetDistanceKm,
      predictedTimeSec,
      method: "riegel_extrapolation",
      anchorDistanceKm: anchor.distanceKm,
      anchorTimeSec: anchor.timeSec,
    },
    confidence,
    dataQuality,
    requiredInputs,
    dataQuality !== "high"
      ? [`no real best effort close to ${targetDistanceKm}km -- extrapolated (Riegel) from ${anchor.distanceKm}km`]
      : [],
  );
}

export function predict5K(bestEfforts: BestEffort[]): MetricResult<RacePrediction> {
  return predictRaceTime(RACE_DISTANCES_KM.fiveK, bestEfforts);
}

export function predict10K(bestEfforts: BestEffort[]): MetricResult<RacePrediction> {
  return predictRaceTime(RACE_DISTANCES_KM.tenK, bestEfforts);
}

export function predictHalfMarathon(bestEfforts: BestEffort[]): MetricResult<RacePrediction> {
  return predictRaceTime(RACE_DISTANCES_KM.halfMarathon, bestEfforts);
}

export function predictMarathon(bestEfforts: BestEffort[]): MetricResult<RacePrediction> {
  return predictRaceTime(RACE_DISTANCES_KM.marathon, bestEfforts);
}
