import { describe, expect, it } from "vitest";
import { generateNutritionRecommendation } from "../../recommendations/nutritionRecommendations";

const today = "2026-07-18";

describe("generateNutritionRecommendation", () => {
  it("computes a gram range when athlete weight is known", () => {
    const rec = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "moderate" }, today);
    // moderate band is 5-7 g/kg -> 350-490g for a 70kg athlete
    expect(rec.description).toContain("350");
    expect(rec.description).toContain("490");
  });

  it("falls back to a per-kg range (no computed grams) when weight is unknown", () => {
    const rec = generateNutritionRecommendation({ athleteWeightKg: null, todaySessionLoad: "moderate" }, today);
    expect(rec.description).toContain("per kg of bodyweight");
    expect(rec.description).not.toMatch(/\d{3,}g/); // no 3+ digit gram amount computed
  });

  it("raises priority for heavy/extreme session loads", () => {
    const heavy = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "heavy" }, today);
    const light = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "light" }, today);
    expect(heavy.priority).toBeLessThan(light.priority);
  });

  it("scales the recommended range up with session load", () => {
    const rest = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "rest" }, today);
    const extreme = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "extreme" }, today);
    expect(rest.description).toContain("210"); // 3g/kg * 70
    expect(extreme.description).toContain("560"); // 8g/kg * 70
  });

  it("is type 'nutrition' and has higher confidence when weight is known", () => {
    const withWeight = generateNutritionRecommendation({ athleteWeightKg: 70, todaySessionLoad: "moderate" }, today);
    const withoutWeight = generateNutritionRecommendation({ athleteWeightKg: null, todaySessionLoad: "moderate" }, today);
    expect(withWeight.type).toBe("nutrition");
    expect(withWeight.confidence).toBeGreaterThan(withoutWeight.confidence);
  });
});
