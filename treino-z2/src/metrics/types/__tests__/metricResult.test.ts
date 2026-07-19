import { describe, expect, it } from "vitest";
import { metricResult, unavailableMetric } from "../metricResult";

describe("metricResult", () => {
  it("builds the full envelope from its arguments", () => {
    expect(metricResult(42, 0.8, "high", ["input a"], ["missing b"])).toEqual({
      value: 42,
      confidence: 0.8,
      dataQuality: "high",
      requiredInputs: ["input a"],
      missingInputs: ["missing b"],
    });
  });

  it("defaults missingInputs to an empty array when omitted", () => {
    expect(metricResult(42, 0.8, "high", ["input a"]).missingInputs).toEqual([]);
  });

  it("clamps confidence above 1 down to 1", () => {
    expect(metricResult(1, 1.5, "high", []).confidence).toBe(1);
  });

  it("clamps confidence below 0 up to 0", () => {
    expect(metricResult(1, -0.5, "low", []).confidence).toBe(0);
  });
});

describe("unavailableMetric", () => {
  it("returns a null value, zero confidence and low data quality", () => {
    expect(unavailableMetric(["ctl", "atl"], ["not enough activities"])).toEqual({
      value: null,
      confidence: 0,
      dataQuality: "low",
      requiredInputs: ["ctl", "atl"],
      missingInputs: ["not enough activities"],
    });
  });
});
