import { RecommendationFactory } from "./recommendationFactory";
import type { Recommendation } from "../types/recommendation";

export interface RaceStrategyInput {
  raceDistanceKm: number;
  /** From the Prediction Engine's race-time Prediction -- consumed, never computed here. */
  predictedTimeSec: number;
  supportingPredictions: string[];
  /** From the Metrics Engine's LT2 calculation (heart-rate-adjacent unit). */
  lt2HeartRate: number | null;
  /** From the Metrics Engine's LT2 calculation (power_watts unit). */
  lt2PowerWatts: number | null;
}

interface DistanceGuidance {
  distanceKm: number;
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
const DISTANCE_GUIDANCE: DistanceGuidance[] = [
  {
    distanceKm: 5,
    lt2PercentRange: { min: 1.0, max: 1.03 },
    nutritionStrategy: "No fueling needed during the race; a light, familiar carbohydrate snack 2-3 hours before is enough.",
    hydrationStrategy: "Hydrate normally in the 24 hours before; no in-race hydration needed for most athletes.",
    warmup: "15-20 minutes easy jogging plus strides, building to near race effort just before the start.",
    recoveryPlan: "Easy movement or full rest for 1-2 days; resume normal training within 3-4 days.",
  },
  {
    distanceKm: 10,
    lt2PercentRange: { min: 0.97, max: 1.0 },
    nutritionStrategy: "No fueling needed during the race for most athletes; a light carbohydrate snack 2-3 hours before.",
    hydrationStrategy: "Hydrate normally beforehand; small sips only if conditions are hot.",
    warmup: "15-20 minutes easy jogging plus strides.",
    recoveryPlan: "Easy movement for 2-3 days before resuming quality training.",
  },
  {
    distanceKm: 21.0975,
    lt2PercentRange: { min: 0.9, max: 0.95 },
    nutritionStrategy: "30-60g carbohydrate per hour, starting around 45 minutes in, if racing longer than ~75 minutes.",
    hydrationStrategy: "400-600ml in the 2 hours before the race; small regular sips during, adjusted for conditions.",
    warmup: "10-15 minutes easy jogging plus a few short strides -- less than for shorter races, to preserve glycogen.",
    recoveryPlan: "Easy movement for 3-5 days; full quality training resumes after about a week.",
  },
  {
    distanceKm: 42.195,
    lt2PercentRange: { min: 0.8, max: 0.88 },
    nutritionStrategy: "30-60g carbohydrate per hour (up to ~90g/hour for well-trained athletes using multiple carbohydrate sources), starting by 45 minutes in.",
    hydrationStrategy: "400-600ml in the 2 hours before the race; 150-250ml every 15-20 minutes during, adjusted for sweat rate and conditions.",
    warmup: "10 minutes easy jogging plus light mobility -- minimal, since the race itself starts easy.",
    recoveryPlan: "Very easy movement only for the first week; full return to quality training typically takes 2-4 weeks.",
  },
];

/** Picks the guidance tier whose reference distance is closest to raceDistanceKm in log-distance (same method the Prediction Engine's Race Predictor uses to pick an anchor). */
function closestGuidance(raceDistanceKm: number): DistanceGuidance {
  let closest = DISTANCE_GUIDANCE[0];
  let smallestLogDiff = Infinity;
  for (const entry of DISTANCE_GUIDANCE) {
    const diff = Math.abs(Math.log(raceDistanceKm / entry.distanceKm));
    if (diff < smallestLogDiff) {
      smallestLogDiff = diff;
      closest = entry;
    }
  }
  return closest;
}

/**
 * "estratégia de prova" (Race Strategy Recommendation). Target pace is
 * derived directly from `predictedTimeSec` (an existing Prediction
 * Engine output, divided by distance) -- never a newly computed
 * prediction. Target heart rate / power are the athlete's own LT2 (from
 * the Metrics Engine) scaled by a standard distance-based effort
 * percentage. Returns one Recommendation per facet (pace, nutrition,
 * hydration, warmup, recovery) rather than one bundled object, so each
 * can carry its own confidence/reasoning and be prioritized independently.
 */
export function generateRaceStrategyRecommendations(input: RaceStrategyInput, createdAt: string): Recommendation[] {
  const { raceDistanceKm, predictedTimeSec, supportingPredictions, lt2HeartRate, lt2PowerWatts } = input;
  const guidance = closestGuidance(raceDistanceKm);
  const { min: pctMin, max: pctMax } = guidance.lt2PercentRange;

  const targetPaceSecPerKm = predictedTimeSec / raceDistanceKm;
  const paceMinPerKm = Math.floor(targetPaceSecPerKm / 60);
  const paceSecRemainder = Math.round(targetPaceSecPerKm % 60);

  const recommendations: Recommendation[] = [
    RecommendationFactory.create({
      type: "race_strategy",
      kind: "race_pace_target",
      priority: 1,
      title: "Race Pace Target",
      description: `Target pace: ${paceMinPerKm}:${paceSecRemainder.toString().padStart(2, "0")}/km.`,
      reasoning: `Derived directly from the predicted race time (${predictedTimeSec.toFixed(0)}s) divided by the race distance (${raceDistanceKm}km) -- no new prediction made here.`,
      supportingMetrics: [],
      supportingPredictions,
      confidence: 0.75,
      createdAt,
      idSuffix: `${raceDistanceKm}km`,
    }),
  ];

  if (lt2HeartRate != null) {
    const min = Math.round(lt2HeartRate * pctMin);
    const max = Math.round(lt2HeartRate * pctMax);
    recommendations.push(
      RecommendationFactory.create({
        type: "race_strategy",
        kind: "race_heart_rate_target",
        priority: 2,
        title: "Race Heart Rate Target",
        description: `Target heart rate range: ${min}-${max} bpm.`,
        reasoning: `${(pctMin * 100).toFixed(0)}-${(pctMax * 100).toFixed(0)}% of LT2 heart rate (${lt2HeartRate} bpm), the standard effort band for this distance.`,
        supportingMetrics: ["lt2"],
        confidence: 0.65,
        createdAt,
        idSuffix: `${raceDistanceKm}km`,
      }),
    );
  }

  if (lt2PowerWatts != null) {
    const min = Math.round(lt2PowerWatts * pctMin);
    const max = Math.round(lt2PowerWatts * pctMax);
    recommendations.push(
      RecommendationFactory.create({
        type: "race_strategy",
        kind: "race_power_target",
        priority: 2,
        title: "Race Power Target",
        description: `Target power range: ${min}-${max}W.`,
        reasoning: `${(pctMin * 100).toFixed(0)}-${(pctMax * 100).toFixed(0)}% of LT2 power (${lt2PowerWatts}W), the standard effort band for this distance.`,
        supportingMetrics: ["lt2"],
        confidence: 0.65,
        createdAt,
        idSuffix: `${raceDistanceKm}km`,
      }),
    );
  }

  recommendations.push(
    RecommendationFactory.create({
      type: "race_strategy",
      kind: "race_fueling_plan",
      priority: 3,
      title: "Race Fueling Plan",
      description: `${guidance.nutritionStrategy} ${guidance.hydrationStrategy}`,
      reasoning: `Standard nutrition/hydration guidance for a ${raceDistanceKm}km effort (ACSM/ISSN-style ranges).`,
      supportingMetrics: [],
      confidence: 0.55,
      createdAt,
      idSuffix: `${raceDistanceKm}km`,
    }),
    RecommendationFactory.create({
      type: "race_strategy",
      kind: "race_warmup_and_recovery",
      priority: 4,
      title: "Warmup & Post-Race Recovery",
      description: `Warmup: ${guidance.warmup} Recovery: ${guidance.recoveryPlan}`,
      reasoning: `Standard warmup/recovery guidance for a ${raceDistanceKm}km effort.`,
      supportingMetrics: [],
      confidence: 0.55,
      createdAt,
      idSuffix: `${raceDistanceKm}km`,
    }),
  );

  return recommendations;
}
