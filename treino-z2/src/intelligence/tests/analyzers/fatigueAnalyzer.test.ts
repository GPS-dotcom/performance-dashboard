import { describe, expect, it } from "vitest";
import { analyzeAccumulatedFatigue, analyzeExcessLoad, analyzeInsufficientRecovery } from "../../analyzers/fatigueAnalyzer";
import type { TrainingLoadPoint } from "../../../metrics";

const today = "2026-06-20";

function points(count: number, valueOf: (i: number) => Partial<TrainingLoadPoint>, startDate = "2026-06-01"): TrainingLoadPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(start + i * 86400000).toISOString().slice(0, 10),
    ctl: 50,
    atl: 50,
    tsb: 0,
    ...valueOf(i),
  }));
}

describe("analyzeAccumulatedFatigue", () => {
  it("returns null on an empty series", () => {
    expect(analyzeAccumulatedFatigue([], today)).toBeNull();
  });

  it("returns null when TSB has not stayed below threshold long enough", () => {
    const series = points(10, (i) => ({ tsb: i >= 8 ? -25 : 5 }));
    expect(analyzeAccumulatedFatigue(series, today)).toBeNull();
  });

  it("reports accumulated fatigue (warning) when TSB has been at/below threshold for the minimum consecutive days", () => {
    const series = points(10, (i) => ({ tsb: i >= 4 ? -22 : 5 }));
    const insight = analyzeAccumulatedFatigue(series, today);
    expect(insight?.title).toBe("Accumulated Fatigue");
    expect(insight?.severity).toBe("warning");
    expect(insight?.category).toBe("recovery");
  });

  it("escalates to critical severity when TSB is below the critical threshold", () => {
    const series = points(10, (i) => ({ tsb: i >= 4 ? -35 : 5 }));
    const insight = analyzeAccumulatedFatigue(series, today);
    expect(insight?.severity).toBe("critical");
  });

  it("breaks the consecutive-day count on the first day above threshold, scanning from the most recent day backward", () => {
    // Most recent day is above threshold -- no active streak, even though
    // there was a long stretch below threshold earlier.
    const series = points(10, (i) => (i === 9 ? { tsb: 5 } : { tsb: -25 }));
    expect(analyzeAccumulatedFatigue(series, today)).toBeNull();
  });
});

describe("analyzeInsufficientRecovery", () => {
  it("returns null when the window has fewer points than windowDays", () => {
    const series = points(3, () => ({ tsb: -5 }));
    expect(analyzeInsufficientRecovery(series, 5, today)).toBeNull();
  });

  it("returns null when the window contains any non-negative TSB day", () => {
    const series = points(5, (i) => ({ tsb: i === 2 ? 1 : -5 }));
    expect(analyzeInsufficientRecovery(series, 5, today)).toBeNull();
  });

  it("returns null when TSB is negative throughout but recovering (last > first)", () => {
    const series = points(5, (i) => ({ tsb: -10 + i * 2 }));
    expect(analyzeInsufficientRecovery(series, 5, today)).toBeNull();
  });

  it("reports insufficient recovery when TSB stays negative and flat/worsening across the window", () => {
    const series = points(5, (i) => ({ tsb: -10 - i }));
    const insight = analyzeInsufficientRecovery(series, 5, today);
    expect(insight?.title).toBe("Insufficient Recovery Time");
    expect(insight?.severity).toBe("warning");
    expect(insight?.category).toBe("recovery");
  });
});

describe("analyzeExcessLoad", () => {
  it("returns null with fewer than 14 days of data", () => {
    const series = points(10, () => ({ atl: 50 }));
    expect(analyzeExcessLoad(series, today)).toBeNull();
  });

  it("returns null when prior week's ATL average is zero", () => {
    const series = points(14, (i) => ({ atl: i < 7 ? 0 : 50 }));
    expect(analyzeExcessLoad(series, today)).toBeNull();
  });

  it("returns null when the week-over-week ATL increase is below the threshold", () => {
    const series = points(14, (i) => ({ atl: i < 7 ? 50 : 55 }));
    expect(analyzeExcessLoad(series, today)).toBeNull();
  });

  it("reports excessive training load increase when ATL spikes week-over-week", () => {
    const series = points(14, (i) => ({ atl: i < 7 ? 50 : 75 }));
    const insight = analyzeExcessLoad(series, today);
    expect(insight?.title).toBe("Excessive Training Load Increase");
    expect(insight?.severity).toBe("warning");
    expect(insight?.category).toBe("training_load");
  });
});
