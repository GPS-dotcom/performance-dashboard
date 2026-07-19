import { describe, expect, it } from "vitest";
import { calculateHrDrift } from "../hrDriftCalculator";
import type { ActivityRecordPoint } from "../../models/activityRecordPoint";

function makeRecords(count: number, speedMps: number, hrForIndex: (i: number) => number): ActivityRecordPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    recordedAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    speedMps,
    heartRate: hrForIndex(i),
  }));
}

describe("calculateHrDrift", () => {
  it("is unavailable with fewer than 20 usable records", () => {
    const records = makeRecords(10, 3, () => 140);
    expect(calculateHrDrift(records).value).toBeNull();
  });

  it("reports 0 decoupling when pace:HR ratio is constant throughout", () => {
    const records = makeRecords(40, 3, () => 150);
    const result = calculateHrDrift(records);
    expect(result.value!.decouplingPercent).toBeCloseTo(0, 5);
  });

  it("reports positive decoupling when HR rises for the same pace", () => {
    // First half HR 140, second half HR 154 (10% higher) at constant speed -- ratio falls ~9%.
    const records = makeRecords(40, 3, (i) => (i < 20 ? 140 : 154));
    const result = calculateHrDrift(records);
    expect(result.value!.decouplingPercent).toBeGreaterThan(0);
  });

  it("reports negative decoupling when the pace:HR ratio improves", () => {
    const records = makeRecords(40, 3, (i) => (i < 20 ? 154 : 140));
    const result = calculateHrDrift(records);
    expect(result.value!.decouplingPercent).toBeLessThan(0);
  });

  it("ignores records missing speed or heart rate", () => {
    const records: ActivityRecordPoint[] = [
      ...makeRecords(25, 3, () => 140),
      { recordedAt: new Date(2026, 0, 1, 0, 1, 0).toISOString(), speedMps: null, heartRate: 140 },
      { recordedAt: new Date(2026, 0, 1, 0, 1, 1).toISOString(), speedMps: 3, heartRate: null },
    ];
    const result = calculateHrDrift(records);
    expect(result.value).not.toBeNull();
  });

  it("reports high data quality with >= 600 usable records", () => {
    const records = makeRecords(600, 3, () => 140);
    expect(calculateHrDrift(records).dataQuality).toBe("high");
  });

  it("reports medium data quality between 100 and 599 records", () => {
    const records = makeRecords(150, 3, () => 140);
    expect(calculateHrDrift(records).dataQuality).toBe("medium");
  });

  it("reports low data quality just above the minimum", () => {
    const records = makeRecords(25, 3, () => 140);
    expect(calculateHrDrift(records).dataQuality).toBe("low");
  });
});
