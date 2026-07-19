import { heuristicBound } from "./shared/confidenceInterval";
import type { PredictionModel, ModelOutput } from "../models/predictionModel";
import type { BestEffort } from "../types/seriesTypes";

export interface RaceModelInput {
  targetDistanceKm: number;
  bestEfforts: BestEffort[];
}

export interface RaceModelValue {
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
// Riegel is a single deterministic extrapolation, not a fitted
// regression -- there's no residual scatter to build a statistical
// interval from, so its bound uses the confidence-scaled heuristic band
// (see shared/confidenceInterval.ts). At worst (confidence -> 0) the
// band spans +-40% of the predicted time; at confidence 1 it collapses
// to the point estimate.
const MAX_RELATIVE_HALF_WIDTH = 0.4;

/**
 * Predicts a race time at `targetDistanceKm`. Uses a real recorded best
 * effort directly if one exists close to the target distance; otherwise
 * extrapolates via Riegel's formula from whichever available best effort
 * is closest in log-distance to the target (log-distance ratio treats
 * "2x longer" and "2x shorter" symmetrically, and is what the confidence
 * decay is based on).
 */
export function predictRaceTimeRiegel(input: RaceModelInput): ModelOutput<RaceModelValue> {
  const { targetDistanceKm, bestEfforts } = input;
  if (bestEfforts.length === 0) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: ["no best efforts available"] };
  }

  const exact = bestEfforts.find((e) => Math.abs(e.distanceKm - targetDistanceKm) <= EXACT_MATCH_TOLERANCE_KM);
  if (exact) {
    const bound = heuristicBound(exact.timeSec, 0.95, exact.timeSec * MAX_RELATIVE_HALF_WIDTH);
    return {
      value: { predictedTimeSec: exact.timeSec, method: "actual_best_effort", anchorDistanceKm: exact.distanceKm, anchorTimeSec: exact.timeSec },
      confidence: 0.95,
      lowerBound: bound.lowerBound,
      upperBound: bound.upperBound,
      assumptions: ["a real best effort was already recorded near this distance -- no extrapolation performed"],
      missingInputs: [],
    };
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
  if (!anchor) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: ["no usable anchor distance"] };
  }

  const predictedTimeSec = anchor.timeSec * Math.pow(targetDistanceKm / anchor.distanceKm, RIEGEL_EXPONENT);
  const confidence = Math.max(0.05, Math.min(0.9, 0.9 * Math.exp(-CONFIDENCE_DECAY_RATE * bestLogRatio)));
  const bound = heuristicBound(predictedTimeSec, confidence, predictedTimeSec * MAX_RELATIVE_HALF_WIDTH);

  return {
    value: { predictedTimeSec, method: "riegel_extrapolation", anchorDistanceKm: anchor.distanceKm, anchorTimeSec: anchor.timeSec },
    confidence,
    lowerBound: bound.lowerBound,
    upperBound: bound.upperBound,
    assumptions: [
      `no real best effort close to ${targetDistanceKm}km -- extrapolated via Riegel's formula (exponent ${RIEGEL_EXPONENT}) from a ${anchor.distanceKm}km effort`,
      "assumes similar aerobic/anaerobic balance and pacing discipline at the target distance as at the anchor distance",
    ],
    missingInputs: [],
  };
}

export const riegelRaceModel: PredictionModel<RaceModelInput, RaceModelValue> = {
  modelId: "riegel-extrapolation",
  version: "1.0.0",
  predict: predictRaceTimeRiegel,
};
