import { describe, expect, it } from "vitest";
import {
  analyzePlanAdherence,
  analyzeTrainingRegularity,
  analyzeVolumeConsistency,
  analyzeWeeklyFrequency,
} from "../../analyzers/consistencyAnalyzer";
import type { WeeklyTrainingSummary } from "../../types/analyzerInputs";

const today = "2026-06-06";

function week(weekStart: string, sessionsCompleted: number, distanceKm = 30, durationS = 10800): WeeklyTrainingSummary {
  return { weekStart, sessionsCompleted, distanceKm, durationS };
}

describe("analyzeWeeklyFrequency", () => {
  it("returns null with fewer weeks than MIN_WEEKS_FOR_CONSISTENCY_INSIGHT", () => {
    const weeks = [week("2026-06-01", 3), week("2026-05-25", 3)];
    expect(analyzeWeeklyFrequency(weeks, today)).toBeNull();
  });

  it("reports excellent consistency when almost every week is active", () => {
    const weeks = Array.from({ length: 8 }, (_, i) => week(`2026-0${5 + Math.floor(i / 4)}-0${(i % 4) + 1}`, 3));
    const insight = analyzeWeeklyFrequency(weeks, today);
    expect(insight?.title).toBe("Excellent Training Consistency");
    expect(insight?.severity).toBe("positive");
  });

  it("reports reduced consistency when a large fraction of weeks are missed", () => {
    const weeks = [
      week("2026-05-04", 0),
      week("2026-05-11", 0),
      week("2026-05-18", 0),
      week("2026-05-25", 3),
      week("2026-06-01", 3),
    ];
    const insight = analyzeWeeklyFrequency(weeks, today);
    expect(insight?.title).toBe("Reduced Consistency");
    expect(insight?.severity).toBe("warning");
  });

  it("returns null in the middle ground (neither excellent nor reduced)", () => {
    const weeks = [
      week("2026-05-04", 3),
      week("2026-05-11", 0),
      week("2026-05-18", 3),
      week("2026-05-25", 3),
      week("2026-06-01", 3),
    ];
    expect(analyzeWeeklyFrequency(weeks, today)).toBeNull();
  });
});

describe("analyzeVolumeConsistency", () => {
  it("returns null with fewer weeks than the minimum", () => {
    expect(analyzeVolumeConsistency([week("2026-06-01", 3)], today)).toBeNull();
  });

  it("returns null when the mean volume is zero", () => {
    const weeks = [week("2026-05-25", 0, 0), week("2026-06-01", 0, 0), week("2026-06-08", 0, 0)];
    expect(analyzeVolumeConsistency(weeks, today)).toBeNull();
  });

  it("reports stable volume when weekly distance barely varies", () => {
    const weeks = [week("2026-05-25", 3, 30), week("2026-06-01", 3, 31), week("2026-06-08", 3, 29)];
    const insight = analyzeVolumeConsistency(weeks, today);
    expect(insight?.title).toBe("Training Volume Stable");
    expect(insight?.severity).toBe("positive");
  });

  it("reports irregular volume when weekly distance swings a lot", () => {
    const weeks = [week("2026-05-25", 3, 10), week("2026-06-01", 3, 50), week("2026-06-08", 3, 15)];
    const insight = analyzeVolumeConsistency(weeks, today);
    expect(insight?.title).toBe("Training Volume Irregular");
    expect(insight?.severity).toBe("warning");
  });
});

describe("analyzePlanAdherence", () => {
  const weeks = [week("2026-05-25", 4), week("2026-06-01", 4), week("2026-06-08", 4)];

  it("returns null when no plan is given (plannedSessionsPerWeek is null)", () => {
    expect(analyzePlanAdherence(weeks, null, today)).toBeNull();
  });

  it("returns null when plannedSessionsPerWeek is zero or negative", () => {
    expect(analyzePlanAdherence(weeks, 0, today)).toBeNull();
    expect(analyzePlanAdherence(weeks, -2, today)).toBeNull();
  });

  it("returns null with fewer weeks than the minimum", () => {
    expect(analyzePlanAdherence([week("2026-06-08", 4)], 4, today)).toBeNull();
  });

  it("reports strong adherence when completed sessions meet the good ratio", () => {
    const insight = analyzePlanAdherence(weeks, 4, today);
    expect(insight?.title).toBe("Plan Adherence Strong");
    expect(insight?.severity).toBe("positive");
  });

  it("reports weak adherence when completed sessions fall short", () => {
    const sparseWeeks = [week("2026-05-25", 1), week("2026-06-01", 1), week("2026-06-08", 1)];
    const insight = analyzePlanAdherence(sparseWeeks, 4, today);
    expect(insight?.title).toBe("Plan Adherence Weak");
    expect(insight?.severity).toBe("warning");
  });
});

describe("analyzeTrainingRegularity", () => {
  it("returns null with fewer weeks than the minimum", () => {
    expect(analyzeTrainingRegularity([week("2026-06-08", 4)], today)).toBeNull();
  });

  it("reports a regular pattern when no gap exceeds the max regular gap", () => {
    const weeks = [week("2026-05-25", 3), week("2026-06-01", 0), week("2026-06-08", 3)];
    const insight = analyzeTrainingRegularity(weeks, today);
    expect(insight?.title).toBe("Regular Training Pattern");
    expect(insight?.severity).toBe("positive");
  });

  it("reports a training interruption when a gap of consecutive missed weeks exceeds the max", () => {
    const weeks = [week("2026-05-18", 3), week("2026-05-25", 0), week("2026-06-01", 0), week("2026-06-08", 3)];
    const insight = analyzeTrainingRegularity(weeks, today);
    expect(insight?.title).toBe("Training Interruption Detected");
    expect(insight?.severity).toBe("warning");
    expect(insight?.evidence[0]).toContain("2 consecutive weeks");
  });

  it("sorts weeks by weekStart before scanning for gaps", () => {
    const weeks = [week("2026-06-08", 3), week("2026-05-18", 3), week("2026-05-25", 0), week("2026-06-01", 0)];
    const insight = analyzeTrainingRegularity(weeks, today);
    expect(insight?.title).toBe("Training Interruption Detected");
  });
});
