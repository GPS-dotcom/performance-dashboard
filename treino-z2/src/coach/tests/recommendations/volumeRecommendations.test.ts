import { describe, expect, it } from "vitest";
import { generateVolumeRecommendation } from "../../recommendations/volumeRecommendations";
import type { VolumeSignals } from "../../types/signals";

const today = "2026-07-18";

function signals(overrides: Partial<VolumeSignals> = {}): VolumeSignals {
  return { acwr: 1.0, weeklyDistanceKm: 40, weeklyDistanceTrend: "stable", consistencyRatio: 0.9, ...overrides };
}

describe("generateVolumeRecommendation", () => {
  it("recommends reducing volume when ACWR is above the danger threshold", () => {
    const rec = generateVolumeRecommendation(signals({ acwr: 1.8 }), today);
    expect(rec.title).toBe("Reduce Weekly Volume");
  });

  it("recommends rebuilding gradually when consistency has been low, ahead of a low-ACWR increase suggestion", () => {
    const rec = generateVolumeRecommendation(signals({ consistencyRatio: 0.4, acwr: 0.5 }), today);
    expect(rec.title).toBe("Rebuild Volume Gradually");
  });

  it("recommends increasing volume when ACWR is well below the sweet spot and consistency is fine", () => {
    const rec = generateVolumeRecommendation(signals({ acwr: 0.5 }), today);
    expect(rec.title).toBe("Increase Weekly Volume");
  });

  it("recommends maintaining the current progression when distance is trending up within a safe ACWR range", () => {
    const rec = generateVolumeRecommendation(signals({ acwr: 1.1, weeklyDistanceTrend: "increasing" }), today);
    expect(rec.title).toBe("Maintain Volume Progression");
  });

  it("defaults to maintaining volume when nothing else applies", () => {
    const rec = generateVolumeRecommendation(signals({ weeklyDistanceTrend: "stable" }), today);
    expect(rec.title).toBe("Maintain Weekly Volume");
  });

  it("every result is type 'volume'", () => {
    expect(generateVolumeRecommendation(signals(), today).type).toBe("volume");
  });
});
