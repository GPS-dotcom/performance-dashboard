import { describe, expect, it } from "vitest";
import { unavailableModelOutput } from "../../models/predictionModel";

describe("unavailableModelOutput", () => {
  it("returns a null value, zero confidence, null bounds, no assumptions, and the given missingInputs", () => {
    const output = unavailableModelOutput<number>(["not enough data"]);
    expect(output).toEqual({ value: null, confidence: 0, lowerBound: null, upperBound: null, assumptions: [], missingInputs: ["not enough data"] });
  });

  it("preserves the exact missingInputs array passed in", () => {
    const output = unavailableModelOutput<{ x: number }>(["a", "b"]);
    expect(output.missingInputs).toEqual(["a", "b"]);
  });
});
