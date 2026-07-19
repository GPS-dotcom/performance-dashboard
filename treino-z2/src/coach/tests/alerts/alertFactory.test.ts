import { describe, expect, it } from "vitest";
import { AlertFactory } from "../../alerts/alertFactory";

function baseParams() {
  return {
    category: "injury_risk" as const,
    kind: "high_injury_risk",
    severity: "critical" as const,
    title: "High Injury Risk",
    description: "Injury risk is elevated.",
    actionRequired: "Reduce load.",
    generatedAt: "2026-07-18T10:00:00.000Z",
  };
}

describe("AlertFactory.create", () => {
  it("derives id from kind, generatedAt's date and (absent) idSuffix", () => {
    const alert = AlertFactory.create(baseParams());
    expect(alert.id).toBe("alert:high_injury_risk:2026-07-18");
  });

  it("folds idSuffix into id when provided", () => {
    const alert = AlertFactory.create({ ...baseParams(), idSuffix: "5k" });
    expect(alert.id).toBe("alert:high_injury_risk:2026-07-18:5k");
  });

  it("passes through every other field verbatim", () => {
    const params = baseParams();
    const alert = AlertFactory.create(params);
    expect(alert.category).toBe(params.category);
    expect(alert.severity).toBe(params.severity);
    expect(alert.title).toBe(params.title);
    expect(alert.description).toBe(params.description);
    expect(alert.actionRequired).toBe(params.actionRequired);
    expect(alert.generatedAt).toBe(params.generatedAt);
  });

  it("allows a null actionRequired for purely informational alerts", () => {
    const alert = AlertFactory.create({ ...baseParams(), actionRequired: null });
    expect(alert.actionRequired).toBeNull();
  });
});
