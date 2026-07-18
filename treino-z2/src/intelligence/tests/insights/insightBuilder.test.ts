import { describe, expect, it } from "vitest";
import { buildInsight } from "../../insights/insightBuilder";

function baseParams() {
  return {
    kind: "trend_ctl_improving",
    category: "fitness" as const,
    severity: "information" as const,
    title: "Fitness Improving",
    description: "CTL is improving.",
    evidence: ["some evidence"],
    confidence: 0.9,
    relatedMetrics: ["ctl"],
    date: "2026-07-18",
  };
}

describe("buildInsight", () => {
  it("derives id from kind, date and (absent) idSuffix", () => {
    const insight = buildInsight(baseParams());
    expect(insight.id).toBe("insight:trend_ctl_improving:2026-07-18");
  });

  it("folds idSuffix into id when provided, so two subjects of the same kind/date don't collide", () => {
    const insight = buildInsight({ ...baseParams(), idSuffix: "shoe-a" });
    expect(insight.id).toBe("insight:trend_ctl_improving:2026-07-18:shoe-a");
  });

  it("derives confidenceLevel from confidence via the shared rule", () => {
    expect(buildInsight({ ...baseParams(), confidence: 0.9 }).confidenceLevel).toBe("very_high");
    expect(buildInsight({ ...baseParams(), confidence: 0.5 }).confidenceLevel).toBe("moderate");
  });

  it("clamps confidence into [0, 1]", () => {
    expect(buildInsight({ ...baseParams(), confidence: 1.5 }).confidence).toBe(1);
    expect(buildInsight({ ...baseParams(), confidence: -0.5 }).confidence).toBe(0);
  });

  it("derives priority from category and severity via the shared rule", () => {
    const insight = buildInsight({ ...baseParams(), category: "injury_risk", severity: "critical" });
    expect(insight.priority).toBe(1);
  });

  it("always leaves relatedRecommendations empty (DEC-0006: never this engine's job)", () => {
    const insight = buildInsight(baseParams());
    expect(insight.relatedRecommendations).toEqual([]);
  });

  it("passes through title/description/evidence/relatedMetrics/date/severity/category verbatim", () => {
    const params = baseParams();
    const insight = buildInsight(params);
    expect(insight.title).toBe(params.title);
    expect(insight.description).toBe(params.description);
    expect(insight.evidence).toEqual(params.evidence);
    expect(insight.relatedMetrics).toEqual(params.relatedMetrics);
    expect(insight.date).toBe(params.date);
    expect(insight.severity).toBe(params.severity);
    expect(insight.category).toBe(params.category);
  });
});
