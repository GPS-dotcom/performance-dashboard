import { describe, expect, it } from "vitest";
import { predictRecoveryTime } from "../recoveryTime";

describe("predictRecoveryTime", () => {
  it("matches the hand-computed analytical solution for atl=80, ctl=50", () => {
    const result = predictRecoveryTime(50, 80);
    expect(result.value!.daysUntilRecovered).toBe(4);
    expect(result.value!.assumedRestTss).toBe(0);
  });

  it("matches the hand-computed analytical solution for atl=60, ctl=50", () => {
    expect(predictRecoveryTime(50, 60).value!.daysUntilRecovered).toBe(2);
  });

  it("matches the hand-computed analytical solution for atl=100, ctl=40", () => {
    expect(predictRecoveryTime(40, 100).value!.daysUntilRecovered).toBe(6);
  });

  it("returns 0 days when the athlete is already recovered (atl <= ctl)", () => {
    const result = predictRecoveryTime(50, 40);
    expect(result.value).toEqual({ daysUntilRecovered: 0, assumedRestTss: 0 });
    expect(result.dataQuality).toBe("high");
  });

  it("returns 0 days when atl exactly equals ctl", () => {
    expect(predictRecoveryTime(50, 50).value!.daysUntilRecovered).toBe(0);
  });

  it("is unavailable when ctl or atl is zero or negative", () => {
    expect(predictRecoveryTime(0, 50).value).toBeNull();
    expect(predictRecoveryTime(50, 0).value).toBeNull();
    expect(predictRecoveryTime(-1, 50).value).toBeNull();
  });

  it("lowers data quality and confidence for long projections", () => {
    // A very large ATL relative to CTL pushes the projection past 14 days.
    const result = predictRecoveryTime(20, 500);
    expect(result.value!.daysUntilRecovered).toBeGreaterThan(14);
    expect(result.dataQuality).toBe("low");
    expect(result.confidence).toBe(0.4);
  });
});
