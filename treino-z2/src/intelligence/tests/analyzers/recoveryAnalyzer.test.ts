import { describe, expect, it } from "vitest";
import { analyzeRecoveryVsExpected } from "../../analyzers/recoveryAnalyzer";
import type { MetricSeriesPoint } from "../../types/metricSeries";

const today = "2026-06-20";

function series(values: number[], startDate = "2026-06-01"): MetricSeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  return values.map((value, i) => ({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value }));
}

describe("analyzeRecoveryVsExpected", () => {
  it("returns null when either series has too few points", () => {
    expect(analyzeRecoveryVsExpected(series([50, 55]), series([-5, -2, 0, 2, 4, 6]), today)).toBeNull();
  });

  it("returns null when both series are trending the same way at a similar pace", () => {
    const recovery = series([50, 52, 54, 56, 58, 60]);
    const tsb = series([-5, -3, -1, 1, 3, 5]);
    expect(analyzeRecoveryVsExpected(recovery, tsb, today)).toBeNull();
  });

  it("reports recovery above expected when Recovery Score improves while TSB does not", () => {
    const recovery = series([40, 45, 50, 55, 60, 65]);
    const tsb = series([-5, -5, -5, -5, -5, -5]);
    const insight = analyzeRecoveryVsExpected(recovery, tsb, today);
    expect(insight?.title).toBe("Recovery Above Expected");
    expect(insight?.severity).toBe("positive");
    expect(insight?.relatedMetrics).toEqual(["recovery_score", "tsb"]);
  });

  it("reports recovery above expected when both improve but recovery improves much faster", () => {
    const recovery = series([40, 46, 52, 58, 64, 70]);
    const tsb = series([-10, -9, -8, -7, -6, -5]);
    const insight = analyzeRecoveryVsExpected(recovery, tsb, today);
    expect(insight?.title).toBe("Recovery Above Expected");
  });

  it("reports recovery below expected when Recovery Score declines while TSB does not", () => {
    const recovery = series([65, 60, 55, 50, 45, 40]);
    const tsb = series([-5, -5, -5, -5, -5, -5]);
    const insight = analyzeRecoveryVsExpected(recovery, tsb, today);
    expect(insight?.title).toBe("Recovery Below Expected");
    expect(insight?.severity).toBe("warning");
  });

  it("reports recovery below expected when both decline but recovery declines much faster", () => {
    const recovery = series([70, 64, 58, 52, 46, 40]);
    const tsb = series([-5, -6, -7, -8, -9, -10]);
    const insight = analyzeRecoveryVsExpected(recovery, tsb, today);
    expect(insight?.title).toBe("Recovery Below Expected");
  });
});
