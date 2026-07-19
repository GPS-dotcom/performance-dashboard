// Shared by every rule (decision-engine strategies, recommendation
// generators) that needs a confidence number for a genuinely ambiguous
// case, rather than one of the spec's own exact-match worked examples
// (10_COACH_ENGINE.md p.50 "fatigue increased" = 0.92, p.54 "recovery
// high, fatigue low" = 0.95 -- those two stay literal constants where
// used, not run through this formula). A moderate base, nudged by how
// many signals support the call, capped below the two exact-match
// branches above so this engine never claims more certainty than the
// spec's own calibration examples for an ambiguous case.

const GENERAL_BASE_CONFIDENCE = 0.6;
const GENERAL_CONFIDENCE_PER_SIGNAL = 0.08;
const GENERAL_CONFIDENCE_CAP = 0.85;

export function generalConfidence(supportingSignalCount: number): number {
  return Math.min(GENERAL_CONFIDENCE_CAP, GENERAL_BASE_CONFIDENCE + supportingSignalCount * GENERAL_CONFIDENCE_PER_SIGNAL);
}
