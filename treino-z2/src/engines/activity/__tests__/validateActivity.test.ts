import { describe, expect, it } from "vitest";
import { validateRawActivity } from "../validateActivity";
import type { RawStravaActivity } from "../types";

function makeRaw(overrides: Partial<RawStravaActivity> = {}): RawStravaActivity {
  return {
    id: 123456,
    name: "Longão",
    type: "Run",
    start_date: "2026-07-10T08:00:00Z",
    moving_time: 6000,
    elapsed_time: 6100,
    distance: 20000,
    ...overrides,
  };
}

describe("validateRawActivity", () => {
  it("accepts a valid Run activity with an athlete id", () => {
    const result = validateRawActivity(makeRaw(), "athlete-1");
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects when athlete id is missing", () => {
    const result = validateRawActivity(makeRaw(), null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing Athlete ID.");
  });

  it("rejects when the provider activity id is missing", () => {
    const result = validateRawActivity(makeRaw({ id: undefined as unknown as number }), "athlete-1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing Provider Activity ID.");
  });

  it("rejects when sport type is missing", () => {
    const result = validateRawActivity(makeRaw({ type: undefined, sport_type: undefined }), "athlete-1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing Sport Type.");
  });

  it("rejects unsupported sport types (only Run is supported today)", () => {
    const result = validateRawActivity(makeRaw({ type: "Ride" }), "athlete-1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unsupported Sport Type "Ride".');
  });

  it("prefers sport_type over type when both are present", () => {
    const result = validateRawActivity(makeRaw({ type: "Ride", sport_type: "Run" }), "athlete-1");
    expect(result.valid).toBe(true);
  });

  it("rejects when start time is missing", () => {
    const result = validateRawActivity(makeRaw({ start_date: "" }), "athlete-1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing Start Time.");
  });

  it("rejects when duration is missing or zero", () => {
    const result = validateRawActivity(makeRaw({ moving_time: 0, elapsed_time: 0 }), "athlete-1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing or invalid Duration.");
  });

  it("falls back to elapsed_time when moving_time is absent", () => {
    const result = validateRawActivity(makeRaw({ moving_time: undefined, elapsed_time: 6100 }), "athlete-1");
    expect(result.valid).toBe(true);
  });

  it("accumulates every validation error at once", () => {
    const result = validateRawActivity(
      { id: undefined as unknown as number, name: "x", start_date: "", moving_time: 0, elapsed_time: 0 },
      null,
    );
    expect(result.errors).toEqual([
      "Missing Athlete ID.",
      "Missing Provider Activity ID.",
      "Missing Sport Type.",
      "Missing Start Time.",
      "Missing or invalid Duration.",
    ]);
  });
});
