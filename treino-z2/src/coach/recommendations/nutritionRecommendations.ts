import { RecommendationFactory } from "./recommendationFactory";
import type { Recommendation } from "../types/recommendation";
import type { NutritionSignals } from "../types/signals";

// Carbohydrate intake bands by daily training load, g per kg bodyweight
// per day -- widely published sports-nutrition guidance (ACSM/ISSN-style
// ranges, e.g. Thomas, Erdman & Burke, "Nutrition and Athletic
// Performance", ACSM/AND/DC joint position stand, 2016).
const CARB_BAND_G_PER_KG: Record<NutritionSignals["todaySessionLoad"], { min: number; max: number }> = {
  rest: { min: 3, max: 5 },
  light: { min: 3, max: 5 },
  moderate: { min: 5, max: 7 },
  heavy: { min: 6, max: 10 },
  extreme: { min: 8, max: 12 },
};

/**
 * "alimentação" (Nutrition Recommendation): daily carbohydrate intake
 * guidance keyed to today's training load. General, published ranges --
 * not a personalized macro calculation -- so confidence stays moderate
 * even when the athlete's weight is known.
 */
export function generateNutritionRecommendation(signals: NutritionSignals, createdAt: string): Recommendation {
  const { athleteWeightKg, todaySessionLoad } = signals;
  const band = CARB_BAND_G_PER_KG[todaySessionLoad];

  const description =
    athleteWeightKg != null
      ? `Target roughly ${(band.min * athleteWeightKg).toFixed(0)}-${(band.max * athleteWeightKg).toFixed(0)}g of carbohydrate today (${band.min}-${band.max}g/kg bodyweight).`
      : `Target roughly ${band.min}-${band.max}g of carbohydrate per kg of bodyweight today.`;

  return RecommendationFactory.create({
    type: "nutrition",
    kind: `carb_intake_${todaySessionLoad}`,
    priority: todaySessionLoad === "extreme" || todaySessionLoad === "heavy" ? 3 : 4,
    title: "Carbohydrate Intake",
    description,
    reasoning: `Today's session load is classified as "${todaySessionLoad}", which maps to a published ${band.min}-${band.max}g/kg/day carbohydrate range (ACSM/AND/DC joint position stand, 2016).`,
    supportingMetrics: ["today_session_load"],
    confidence: athleteWeightKg != null ? 0.6 : 0.45,
    createdAt,
  });
}
