import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrainingLoadPoint } from "../../analyzers/trainingLoadTrendAnalyzer";

const fetchMetricsSnapshotHistory = vi.fn<() => Promise<TrainingLoadPoint[]>>();
const upsertMetricsSnapshot = vi.fn<(athleteId: string, point: TrainingLoadPoint) => Promise<{ id: string } | null>>();

vi.mock("../../repositories/metricsSnapshotRepository", () => ({
  fetchMetricsSnapshotHistory: () => fetchMetricsSnapshotHistory(),
  upsertMetricsSnapshot: (athleteId: string, point: TrainingLoadPoint) => upsertMetricsSnapshot(athleteId, point),
}));

const { computeAndPersistTrainingLoad, getTrainingLoadHistory } = await import("../trainingLoadService");

afterEach(() => {
  vi.resetAllMocks();
});

describe("computeAndPersistTrainingLoad", () => {
  it("persists every day of the computed series", async () => {
    upsertMetricsSnapshot.mockResolvedValue({ id: "snap-1" });

    const result = await computeAndPersistTrainingLoad("athlete-1", [
      { date: "2026-01-01", load: 100 },
      { date: "2026-01-02", load: 100 },
    ]);

    expect(result.value).toHaveLength(2);
    expect(upsertMetricsSnapshot).toHaveBeenCalledTimes(2);
    expect(upsertMetricsSnapshot).toHaveBeenNthCalledWith(1, "athlete-1", expect.objectContaining({ date: "2026-01-01" }));
    expect(upsertMetricsSnapshot).toHaveBeenNthCalledWith(2, "athlete-1", expect.objectContaining({ date: "2026-01-02" }));
  });

  it("does not attempt to persist anything when there is no daily load data", async () => {
    const result = await computeAndPersistTrainingLoad("athlete-1", []);

    expect(result.value).toBeNull();
    expect(upsertMetricsSnapshot).not.toHaveBeenCalled();
  });
});

describe("getTrainingLoadHistory", () => {
  it("reads back history without recomputing anything", async () => {
    fetchMetricsSnapshotHistory.mockResolvedValue([{ date: "2026-01-01", ctl: 5, atl: 10, tsb: -5 }]);

    const result = await getTrainingLoadHistory("athlete-1", 400);

    expect(result).toEqual([{ date: "2026-01-01", ctl: 5, atl: 10, tsb: -5 }]);
  });
});
