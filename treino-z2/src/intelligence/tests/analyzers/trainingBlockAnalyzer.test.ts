import { describe, expect, it } from "vitest";
import { comparePeriods, findBestPeriod } from "../../analyzers/trainingBlockAnalyzer";
import type { NamedPeriod } from "../../types/analyzerInputs";
import type { MetricSeriesPoint } from "../../types/metricSeries";

const today = "2026-06-20";

function periodOf(label: string, values: number[]): NamedPeriod {
  const series: MetricSeriesPoint[] = values.map((value, i) => ({ date: `2026-0${1 + Math.floor(i / 28)}-0${(i % 28) + 1}`.slice(0, 10), value }));
  return { label, series };
}

describe("comparePeriods", () => {
  it("returns null when either period has too few points", () => {
    const a = periodOf("Block A", [50, 51]);
    const b = periodOf("Block B", [55, 56, 57]);
    expect(comparePeriods("block", "CTL", "ctl", a, b, "higher_is_better", today)).toBeNull();
  });

  it("returns null when the means are exactly equal", () => {
    const a = periodOf("Block A", [50, 50, 50]);
    const b = periodOf("Block B", [50, 50, 50]);
    expect(comparePeriods("block", "CTL", "ctl", a, b, "higher_is_better", today)).toBeNull();
  });

  it("reports improvement when period B's mean beats period A's under higher_is_better", () => {
    const a = periodOf("Block A", [40, 41, 42]);
    const b = periodOf("Block B", [55, 56, 57]);
    const insight = comparePeriods("block", "CTL", "ctl", a, b, "higher_is_better", today);
    expect(insight?.title).toBe("CTL Improved");
    expect(insight?.severity).toBe("positive");
    expect(insight?.id).toContain("training_block_comparison_ctl_improved");
  });

  it("reports decline when period B's mean is worse than period A's under higher_is_better", () => {
    const a = periodOf("Block A", [55, 56, 57]);
    const b = periodOf("Block B", [40, 41, 42]);
    const insight = comparePeriods("block", "CTL", "ctl", a, b, "higher_is_better", today);
    expect(insight?.title).toBe("CTL Declined");
    expect(insight?.severity).toBe("warning");
  });

  it("reports improvement for a season comparison when the metric is lower_is_better and the mean drops", () => {
    const a = periodOf("Season A", [300, 305, 310]);
    const b = periodOf("Season B", [270, 275, 280]);
    const insight = comparePeriods("season", "Pace", "pace", a, b, "lower_is_better", today);
    expect(insight?.title).toBe("Pace Improved");
    expect(insight?.id).toContain("training_season_comparison_pace_improved");
  });
});

describe("findBestPeriod", () => {
  it("returns null when fewer than two periods are eligible", () => {
    expect(findBestPeriod("block", "CTL", "ctl", [periodOf("Block A", [50, 51, 52])], "higher_is_better", today)).toBeNull();
  });

  it("returns null when the top two periods' means are within the margin threshold", () => {
    const periods = [periodOf("Block A", [50, 50, 50]), periodOf("Block B", [51, 51, 51])];
    expect(findBestPeriod("block", "CTL", "ctl", periods, "higher_is_better", today)).toBeNull();
  });

  it("identifies the period with the highest mean as best under higher_is_better", () => {
    const periods = [periodOf("Block A", [40, 41, 42]), periodOf("Block B", [70, 71, 72]), periodOf("Block C", [50, 51, 52])];
    const insight = findBestPeriod("block", "CTL", "ctl", periods, "higher_is_better", today);
    expect(insight?.title).toBe("Best Training Block");
    expect(insight?.description).toContain("Block B");
  });

  it("identifies the period with the lowest mean as best under lower_is_better", () => {
    const periods = [periodOf("Cycle A", [300, 305, 310]), periodOf("Cycle B", [250, 255, 260]), periodOf("Cycle C", [280, 285, 290])];
    const insight = findBestPeriod("cycle", "Pace", "pace", periods, "lower_is_better", today);
    expect(insight?.description).toContain("Cycle B");
  });

  it("ignores periods below the minimum activity count when picking the best", () => {
    const periods = [
      periodOf("Block A", [40, 41, 42]),
      periodOf("Block B", [90]), // too few points to be eligible
      periodOf("Block C", [70, 71, 72]),
    ];
    const insight = findBestPeriod("block", "CTL", "ctl", periods, "higher_is_better", today);
    expect(insight?.description).toContain("Block C");
  });
});
