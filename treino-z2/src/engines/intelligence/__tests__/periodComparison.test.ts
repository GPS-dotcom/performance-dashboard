import { describe, expect, it } from "vitest";
import { compareSeasons, compareTrainingBlocks } from "../periodComparison";

describe("compareTrainingBlocks", () => {
  it("computes the mean change between two blocks", () => {
    const result = compareTrainingBlocks(
      "CTL",
      { label: "Base", series: [{ date: "2026-05-01", value: 40 }, { date: "2026-05-15", value: 44 }] },
      { label: "Build", series: [{ date: "2026-06-01", value: 50 }, { date: "2026-06-15", value: 54 }] },
    );
    expect(result).not.toBeNull();
    expect(result!.periodAMean).toBe(42);
    expect(result!.periodBMean).toBe(52);
    expect(result!.absoluteChange).toBe(10);
    expect(result!.percentChange).toBeCloseTo((10 / 42) * 100, 6);
    expect(result!.direction).toBe("improved");
    expect(result!.kind).toBe("block_comparison");
  });

  it("treats a rising value as a decline when lower is better", () => {
    const result = compareTrainingBlocks(
      "Pace",
      { label: "Base", series: [{ date: "2026-05-01", value: 260 }] },
      { label: "Build", series: [{ date: "2026-06-01", value: 280 }] },
      "lower_is_better",
    );
    expect(result!.direction).toBe("declined");
  });

  it("returns null when either period has no data", () => {
    expect(
      compareTrainingBlocks("CTL", { label: "A", series: [] }, { label: "B", series: [{ date: "2026-06-01", value: 50 }] }),
    ).toBeNull();
  });

  it("never sets a recommendation", () => {
    const result = compareTrainingBlocks(
      "CTL",
      { label: "A", series: [{ date: "2026-05-01", value: 40 }] },
      { label: "B", series: [{ date: "2026-06-01", value: 50 }] },
    );
    expect(result!.recommendation).toBeNull();
  });
});

describe("compareSeasons", () => {
  it("computes the mean change between two seasons and tags the result as season_comparison", () => {
    const result = compareSeasons(
      "Weekly Volume",
      { label: "2025 Build", series: [{ date: "2025-06-01", value: 60 }] },
      { label: "2026 Build", series: [{ date: "2026-06-01", value: 70 }] },
    );
    expect(result!.kind).toBe("season_comparison");
    expect(result!.direction).toBe("improved");
  });
});
