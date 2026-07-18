import { describe, expect, it } from "vitest";
import { priorityFor } from "../../rules/priorityRules";
import type { InsightCategory } from "../../types/insight";

describe("priorityFor", () => {
  it("returns 1 for any category when severity is critical, overriding the category tier", () => {
    const categories: InsightCategory[] = ["equipment", "fitness", "injury_risk"];
    for (const category of categories) {
      expect(priorityFor(category, "critical")).toBe(1);
    }
  });

  it("maps each category to its documented tier for non-critical severities", () => {
    expect(priorityFor("injury_risk", "warning")).toBe(2);
    expect(priorityFor("recovery", "warning")).toBe(3);
    expect(priorityFor("training_load", "warning")).toBe(3);
    expect(priorityFor("race_readiness", "information")).toBe(4);
    expect(priorityFor("performance", "positive")).toBe(5);
    expect(priorityFor("fitness", "information")).toBe(6);
    expect(priorityFor("consistency", "positive")).toBe(6);
    expect(priorityFor("efficiency", "information")).toBe(7);
    expect(priorityFor("physiology", "information")).toBe(7);
    expect(priorityFor("equipment", "warning")).toBe(8);
  });
});
