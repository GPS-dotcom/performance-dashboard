import { heuristicBound } from "./shared/confidenceInterval";
import { ATL_TIME_CONSTANT_DAYS } from "../../metrics";
import type { ModelOutput, PredictionModel } from "../models/predictionModel";

export interface RecoveryModelInput {
  ctl: number;
  atl: number;
}

export interface RecoveryModelValue {
  daysUntilRecovered: number;
  assumedDailyTss: number;
}

export interface LoadImpactModelInput {
  ctl: number;
  atl: number;
  /** Athlete's recent average daily Training Load (TSS or equivalent) -- the load level "current load impact" is measured against. */
  currentDailyTss: number;
}

export interface LoadImpactModelValue {
  /** Extra days recovery takes if training continues at currentDailyTss, vs. complete rest. Null when recovery never completes under this load (see recoversUnderThisLoad). */
  additionalDaysUntilRecovered: number | null;
  daysUntilRecoveredAtCurrentLoad: number | null;
  daysUntilRecoveredAtRest: number;
  assumedDailyTss: number;
  /** False when currentDailyTss is at/above CTL -- ATL then converges toward a level at/above CTL and TSB never returns to neutral. */
  recoversUnderThisLoad: boolean;
}

const DECAY_FACTOR = 1 - 1 / ATL_TIME_CONSTANT_DAYS; // 6/7

/**
 * Solves the Metrics Engine's own ATL EWMA recurrence
 * (calculateTrainingLoadSeries: atl += (tss - atl) / 7) analytically for
 * a *constant* assumed daily TSS from today onward:
 * atl(n) = dailyTss + (atl0 - dailyTss) * decayFactor^n. Returns the
 * smallest integer n >= 0 such that atl(n) <= ctl (CTL is assumed
 * roughly constant over the projection window, since it decays far more
 * slowly than ATL), or null if dailyTss >= ctl -- in that case atl(n)
 * converges toward dailyTss >= ctl and never crosses back below it, so
 * "days until recovered" has no finite answer under that load.
 */
function daysUntilAtlAtOrBelowCtl(ctl: number, atl: number, dailyTss: number): number | null {
  if (atl <= ctl) return 0;
  if (dailyTss >= ctl) return null;

  const ratio = (ctl - dailyTss) / (atl - dailyTss);
  return Math.ceil(Math.log(ratio) / Math.log(DECAY_FACTOR));
}

/** "dias até recuperação completa": days until ATL decays back to/below CTL, assuming complete rest (TSS = 0). */
export function predictRecoveryTimeAtlDecay(input: RecoveryModelInput): ModelOutput<RecoveryModelValue> {
  const { ctl, atl } = input;
  if (ctl <= 0 || atl <= 0) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: ["ctl and atl must be positive"] };
  }

  const daysUntilRecovered = daysUntilAtlAtOrBelowCtl(ctl, atl, 0)!; // dailyTss=0 always < ctl (ctl>0), always finite

  if (daysUntilRecovered === 0) {
    return { value: { daysUntilRecovered: 0, assumedDailyTss: 0 }, confidence: 0.8, lowerBound: 0, upperBound: 0, assumptions: ["already at or below chronic load -- no further rest needed to reach neutral TSB"], missingInputs: [] };
  }

  const confidence = daysUntilRecovered <= 14 ? 0.65 : 0.4;
  const bound = heuristicBound(daysUntilRecovered, confidence, Math.max(2, daysUntilRecovered * 0.5));

  return {
    value: { daysUntilRecovered, assumedDailyTss: 0 },
    confidence,
    lowerBound: Math.max(0, bound.lowerBound),
    upperBound: bound.upperBound,
    assumptions: ["assumes complete rest (TSS = 0) every day until recovered", "assumes CTL stays roughly constant over the projection window"],
    missingInputs: [],
  };
}

export const atlDecayRecoveryModel: PredictionModel<RecoveryModelInput, RecoveryModelValue> = {
  modelId: "atl-decay-analytical-solve",
  version: "1.0.0",
  predict: predictRecoveryTimeAtlDecay,
};

/** "impacto da carga atual": how many extra days recovery takes if training continues at the athlete's recent average load, vs. resting completely. */
export function predictCurrentLoadImpact(input: LoadImpactModelInput): ModelOutput<LoadImpactModelValue> {
  const { ctl, atl, currentDailyTss } = input;
  if (ctl <= 0 || atl <= 0 || currentDailyTss < 0) {
    return { value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: ["ctl and atl must be positive, currentDailyTss must be >= 0"] };
  }

  const daysAtRest = daysUntilAtlAtOrBelowCtl(ctl, atl, 0)!;
  const daysAtCurrentLoad = daysUntilAtlAtOrBelowCtl(ctl, atl, currentDailyTss);
  const recoversUnderThisLoad = daysAtCurrentLoad !== null;
  const additionalDaysUntilRecovered = recoversUnderThisLoad ? daysAtCurrentLoad! - daysAtRest : null;

  const confidence = recoversUnderThisLoad ? (daysAtCurrentLoad! <= 14 ? 0.6 : 0.35) : 0.5;
  const bound =
    additionalDaysUntilRecovered != null ? heuristicBound(additionalDaysUntilRecovered, confidence, Math.max(2, additionalDaysUntilRecovered * 0.5)) : null;

  const assumptions = ["assumes the athlete's recent average daily load continues unchanged", "assumes CTL stays roughly constant over the projection window"];
  const missingInputs = recoversUnderThisLoad ? [] : ["current daily load is at or above chronic load (CTL) -- recovery has no finite horizon at this load"];

  return {
    value: {
      additionalDaysUntilRecovered,
      daysUntilRecoveredAtCurrentLoad: daysAtCurrentLoad,
      daysUntilRecoveredAtRest: daysAtRest,
      assumedDailyTss: currentDailyTss,
      recoversUnderThisLoad,
    },
    confidence,
    lowerBound: bound ? Math.max(0, bound.lowerBound) : null,
    upperBound: bound ? bound.upperBound : null,
    assumptions,
    missingInputs,
  };
}

export const currentLoadImpactModel: PredictionModel<LoadImpactModelInput, LoadImpactModelValue> = {
  modelId: "atl-decay-load-comparison",
  version: "1.0.0",
  predict: predictCurrentLoadImpact,
};
