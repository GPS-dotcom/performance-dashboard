import { RACE_DISTANCES_KM } from "../../prediction";

export interface RaceStrategyInput {
  raceDistanceKm: number;
  /** From Prediction Engine's predictRaceTime -- consumed, never computed here. */
  predictedTimeSec: number;
  /** From Metrics Engine's calculateLT2 (when intensityUnit is heart-rate-adjacent). */
  lt2HeartRate: number | null;
  /** From Metrics Engine's calculateLT2 (when intensityUnit is power_watts). */
  lt2PowerWatts: number | null;
}

export interface RaceStrategy {
  targetPaceSecPerKm: number;
  targetHeartRateRange: { min: number; max: number } | null;
  targetPowerRange: { min: number; max: number } | null;
  nutritionStrategy: string;
  hydrationStrategy: string;
  warmup: string;
  recoveryPlan: string;
}

interface DistanceGuidance {
  lt2PercentRange: { min: number; max: number };
  nutritionStrategy: string;
  hydrationStrategy: string;
  warmup: string;
  recoveryPlan: string;
}

// Standard, widely used endurance-coaching heuristics for race effort
// relative to LT2 (threshold), by distance -- general guidance found
// across mainstream distance-running coaching literature (e.g.
// Pfitzinger & Douglas, Daniels), not an athlete-specific prediction.
// Nutrition/hydration figures follow commonly published sports-nutrition
// ranges (ACSM/ISSN-style: ~30-90g carbohydrate/hour for efforts beyond
// ~75-90 minutes, ~400-600ml fluid pre-race).
const DISTANCE_GUIDANCE: { distanceKm: number; guidance: DistanceGuidance }[] = [
  {
    distanceKm: RACE_DISTANCES_KM.fiveK,
    guidance: {
      lt2PercentRange: { min: 1.0, max: 1.03 },
      nutritionStrategy: "No fueling needed during the race; a light, familiar carbohydrate snack 2-3 hours before is enough.",
      hydrationStrategy: "Hydrate normally in the 24 hours before; no in-race hydration needed for most athletes.",
      warmup: "15-20 minutes easy jogging plus strides, building to near race effort just before the start.",
      recoveryPlan: "Easy movement or full rest for 1-2 days; resume normal training within 3-4 days.",
    },
  },
  {
    distanceKm: RACE_DISTANCES_KM.tenK,
    guidance: {
      lt2PercentRange: { min: 0.97, max: 1.0 },
      nutritionStrategy: "No fueling needed during the race for most athletes; a light carbohydrate snack 2-3 hours before.",
      hydrationStrategy: "Hydrate normally beforehand; small sips only if conditions are hot.",
      warmup: "15-20 minutes easy jogging plus strides.",
      recoveryPlan: "Easy movement for 2-3 days before resuming quality training.",
    },
  },
  {
    distanceKm: RACE_DISTANCES_KM.halfMarathon,
    guidance: {
      lt2PercentRange: { min: 0.9, max: 0.95 },
      nutritionStrategy: "30-60g carbohydrate per hour, starting around 45 minutes in, if racing longer than ~75 minutes.",
      hydrationStrategy: "400-600ml in the 2 hours before the race; small regular sips during, adjusted for conditions.",
      warmup: "10-15 minutes easy jogging plus a few short strides -- less than for shorter races, to preserve glycogen.",
      recoveryPlan: "Easy movement for 3-5 days; full quality training resumes after about a week.",
    },
  },
  {
    distanceKm: RACE_DISTANCES_KM.marathon,
    guidance: {
      lt2PercentRange: { min: 0.8, max: 0.88 },
      nutritionStrategy:
        "30-60g carbohydrate per hour (up to ~90g/hour for well-trained athletes using multiple carbohydrate sources), starting by 45 minutes in.",
      hydrationStrategy: "400-600ml in the 2 hours before the race; 150-250ml every 15-20 minutes during, adjusted for sweat rate and conditions.",
      warmup: "10 minutes easy jogging plus light mobility -- minimal, since the race itself starts easy.",
      recoveryPlan: "Very easy movement only for the first week; full return to quality training typically takes 2-4 weeks.",
    },
  },
];

/** Picks the guidance tier whose reference distance is closest to raceDistanceKm in log-distance (same method as Prediction Engine's anchor selection). */
function closestGuidance(raceDistanceKm: number): DistanceGuidance {
  let closest = DISTANCE_GUIDANCE[0].guidance;
  let smallestLogDiff = Infinity;
  for (const entry of DISTANCE_GUIDANCE) {
    const diff = Math.abs(Math.log(raceDistanceKm / entry.distanceKm));
    if (diff < smallestLogDiff) {
      smallestLogDiff = diff;
      closest = entry.guidance;
    }
  }
  return closest;
}

/**
 * Generates a race strategy. Target pace is derived directly from
 * `predictedTimeSec` (an existing Prediction Engine output, divided by
 * distance) -- this function never predicts a new race time itself.
 * Target heart rate / power are the athlete's own LT2 (from the Metrics
 * Engine) scaled by a standard distance-based effort percentage.
 */
export function generateRaceStrategy(input: RaceStrategyInput): RaceStrategy {
  const { raceDistanceKm, predictedTimeSec, lt2HeartRate, lt2PowerWatts } = input;
  const guidance = closestGuidance(raceDistanceKm);
  const { min: pctMin, max: pctMax } = guidance.lt2PercentRange;

  const targetPaceSecPerKm = predictedTimeSec / raceDistanceKm;

  const targetHeartRateRange =
    lt2HeartRate != null ? { min: Math.round(lt2HeartRate * pctMin), max: Math.round(lt2HeartRate * pctMax) } : null;

  const targetPowerRange =
    lt2PowerWatts != null ? { min: Math.round(lt2PowerWatts * pctMin), max: Math.round(lt2PowerWatts * pctMax) } : null;

  return {
    targetPaceSecPerKm,
    targetHeartRateRange,
    targetPowerRange,
    nutritionStrategy: guidance.nutritionStrategy,
    hydrationStrategy: guidance.hydrationStrategy,
    warmup: guidance.warmup,
    recoveryPlan: guidance.recoveryPlan,
  };
}
