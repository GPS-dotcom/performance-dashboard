import { RecommendationFactory } from "./recommendationFactory";
import type { Recommendation } from "../types/recommendation";
import type { HydrationSignals } from "../types/signals";

// Daily baseline: ~30-35ml/kg bodyweight (general sports-nutrition
// guidance). During-exercise: 400-800ml/hour, ACSM's published range,
// widened toward the top of the range in hot conditions.
const BASELINE_ML_PER_KG = 32.5;
const EXERCISE_ML_PER_HOUR_MIN = 400;
const EXERCISE_ML_PER_HOUR_MAX = 800;
const HOT_CONDITION_ML_PER_HOUR_MAX = 1000;

/**
 * "hidratação" (Hydration Recommendation): daily fluid baseline plus
 * during-exercise fluid guidance for today's session, adjusted for
 * duration and heat.
 */
export function generateHydrationRecommendation(signals: HydrationSignals, createdAt: string): Recommendation {
  const { athleteWeightKg, todaySessionDurationMin, isHotCondition } = signals;

  const baselineMl = athleteWeightKg != null ? Math.round(athleteWeightKg * BASELINE_ML_PER_KG) : null;
  const exerciseMaxPerHour = isHotCondition ? HOT_CONDITION_ML_PER_HOUR_MAX : EXERCISE_ML_PER_HOUR_MAX;

  const parts: string[] = [];
  if (baselineMl != null) parts.push(`~${baselineMl}ml baseline fluid intake today`);
  else parts.push(`~${BASELINE_ML_PER_KG}ml/kg bodyweight baseline fluid intake today`);

  if (todaySessionDurationMin != null && todaySessionDurationMin > 0) {
    const hours = todaySessionDurationMin / 60;
    const minMl = Math.round(EXERCISE_ML_PER_HOUR_MIN * hours);
    const maxMl = Math.round(exerciseMaxPerHour * hours);
    parts.push(`plus ${minMl}-${maxMl}ml during the session (${EXERCISE_ML_PER_HOUR_MIN}-${exerciseMaxPerHour}ml/hour${isHotCondition ? ", widened for hot conditions" : ""})`);
  }

  return RecommendationFactory.create({
    type: "hydration",
    kind: "daily_hydration",
    priority: isHotCondition ? 3 : 4,
    title: "Hydration Plan",
    description: `${parts.join(", ")}.`,
    reasoning: `Based on published daily (${BASELINE_ML_PER_KG}ml/kg) and during-exercise (${EXERCISE_ML_PER_HOUR_MIN}-${EXERCISE_ML_PER_HOUR_MAX}ml/hour) fluid-intake guidance, adjusted for today's session duration${isHotCondition ? " and hot conditions" : ""}.`,
    supportingMetrics: ["today_session_duration"],
    confidence: athleteWeightKg != null && todaySessionDurationMin != null ? 0.6 : 0.45,
    createdAt,
  });
}
