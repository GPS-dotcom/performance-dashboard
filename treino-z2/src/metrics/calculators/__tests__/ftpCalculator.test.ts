import { describe, expect, it } from "vitest";
import { calculateFtp } from "../ftpCalculator";

describe("calculateFtp", () => {
  it("computes FTP as 95% of a 20:00 average power", () => {
    const result = calculateFtp({ durationSec: 20 * 60, averagePowerWatts: 300 });
    expect(result.value).toBeCloseTo(285, 5);
    expect(result.dataQuality).toBe("high");
    expect(result.confidence).toBe(1);
  });

  it("still calculates within the 18-22 minute tolerance band, with lower confidence", () => {
    const result = calculateFtp({ durationSec: 19 * 60, averagePowerWatts: 300 });
    expect(result.value).toBeCloseTo(285, 5);
    expect(result.confidence).toBeLessThan(1);
  });

  it("is unavailable when the effort is shorter than 18 minutes", () => {
    const result = calculateFtp({ durationSec: 10 * 60, averagePowerWatts: 300 });
    expect(result.value).toBeNull();
  });

  it("is unavailable when the effort is longer than 22 minutes", () => {
    const result = calculateFtp({ durationSec: 40 * 60, averagePowerWatts: 300 });
    expect(result.value).toBeNull();
  });

  it("is unavailable with a non-positive power", () => {
    const result = calculateFtp({ durationSec: 20 * 60, averagePowerWatts: 0 });
    expect(result.value).toBeNull();
  });
});
