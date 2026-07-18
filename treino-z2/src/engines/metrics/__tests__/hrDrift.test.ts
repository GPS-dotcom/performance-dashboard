import { describe, expect, it } from "vitest";
import { calculateHrDrift } from "../hrDrift";
import type { ActivityRecordPoint } from "../hrDrift";

function makeRecords(count: number, startSec: number, speedMps: number, heartRate: number): ActivityRecordPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    recordedAt: new Date((startSec + i) * 1000).toISOString(),
    speedMps,
    heartRate,
  }));
}

describe("calculateHrDrift", () => {
  it("detects positive drift when heart rate rises at constant pace", () => {
    // First half: 20 records at speed 3.0, HR 140. Second half: same speed, HR 154 (+10%).
    const records = [...makeRecords(20, 0, 3.0, 140), ...makeRecords(20, 20, 3.0, 154)];

    const result = calculateHrDrift(records);

    expect(result.value).not.toBeNull();
    // decoupling% = (1 - HR1/HR2) * 100 when speed is constant = (1 - 140/154) * 100
    expect(result.value!.decouplingPercent).toBeCloseTo((1 - 140 / 154) * 100, 5);
    expect(result.value!.decouplingPercent).toBeGreaterThan(0);
  });

  it("reports ~0% drift when pace and heart rate both stay constant", () => {
    const records = makeRecords(40, 0, 3.2, 150);
    const result = calculateHrDrift(records);
    expect(result.value!.decouplingPercent).toBeCloseTo(0, 6);
  });

  it("detects negative drift (improving efficiency) when heart rate falls at constant pace", () => {
    const records = [...makeRecords(20, 0, 3.0, 150), ...makeRecords(20, 20, 3.0, 140)];
    const result = calculateHrDrift(records);
    expect(result.value!.decouplingPercent).toBeLessThan(0);
  });

  it("is unavailable with fewer than 20 usable records", () => {
    const result = calculateHrDrift(makeRecords(10, 0, 3.0, 140));
    expect(result.value).toBeNull();
    expect(result.missingInputs).toContain("fewer than 20 usable records");
  });

  it("ignores records with missing speed or heart rate when counting usable records", () => {
    const records: ActivityRecordPoint[] = [
      ...makeRecords(15, 0, 3.0, 140),
      { recordedAt: new Date(15000).toISOString(), speedMps: null, heartRate: 140 },
      { recordedAt: new Date(16000).toISOString(), speedMps: 3.0, heartRate: null },
    ];
    const result = calculateHrDrift(records);
    expect(result.value).toBeNull(); // only 15 usable, below the 20 minimum
  });

  it("marks data quality as high once records reach the ~10-minute (600 point) bar", () => {
    const records = [...makeRecords(300, 0, 3.0, 140), ...makeRecords(300, 300, 3.0, 145)];
    const result = calculateHrDrift(records);
    expect(result.dataQuality).toBe("high");
    expect(result.confidence).toBeCloseTo(1, 6);
  });
});
