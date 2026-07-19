import { describe, expect, it } from "vitest";
import { generateHydrationRecommendation } from "../../recommendations/hydrationRecommendations";

const today = "2026-07-18";

describe("generateHydrationRecommendation", () => {
  it("computes a baseline in ml when weight is known", () => {
    const rec = generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: null, isHotCondition: false }, today);
    // 32.5ml/kg * 70kg = 2275ml
    expect(rec.description).toContain("2275ml");
  });

  it("falls back to a per-kg baseline when weight is unknown", () => {
    const rec = generateHydrationRecommendation({ athleteWeightKg: null, todaySessionDurationMin: null, isHotCondition: false }, today);
    expect(rec.description).toContain("ml/kg");
  });

  it("adds a during-session fluid range when a session duration is given", () => {
    const rec = generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: 60, isHotCondition: false }, today);
    expect(rec.description).toContain("during the session");
    expect(rec.description).toContain("400-800ml/hour");
  });

  it("omits the during-session range when no duration is given", () => {
    const rec = generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: null, isHotCondition: false }, today);
    expect(rec.description).not.toContain("during the session");
  });

  it("widens the during-session range and raises priority in hot conditions", () => {
    const hot = generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: 60, isHotCondition: true }, today);
    const normal = generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: 60, isHotCondition: false }, today);
    expect(hot.description).toContain("1000ml/hour");
    expect(hot.priority).toBeLessThan(normal.priority);
  });

  it("is type 'hydration'", () => {
    expect(generateHydrationRecommendation({ athleteWeightKg: 70, todaySessionDurationMin: null, isHotCondition: false }, today).type).toBe("hydration");
  });
});
