import { afterEach, describe, expect, it, vi } from "vitest";
import { readDailyBriefCache, writeDailyBriefCache } from "../dailyBriefCache";
import type { DailyBriefViewModel } from "../assembleDailyBrief";

const CACHE_KEY = "treino-z2:daily-brief:v1";

function fixture(): DailyBriefViewModel {
  return {
    brief: {
      date: "2026-07-18",
      status: "Recovery is good.",
      recovery: { score: 75, label: "good" },
      fitness: { score: 60, label: "good" },
      trainingRecommendation: {
        recommendation: "Long Run",
        reason: "x",
        evidence: [],
        confidence: 0.7,
        expectedOutcome: "y",
        alternative: null,
      },
      keyInsights: [],
      raceCountdown: null,
      warnings: [],
      opportunities: [],
      confidenceLevel: 0.7,
    },
    insights: [],
    racePredictions: [],
    recoveryTime: null,
    recoveryRecommendations: [],
    trainingLoadHistory: [],
    timelineEvents: [],
  };
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("readDailyBriefCache / writeDailyBriefCache", () => {
  it("returns null when nothing has been cached yet", () => {
    expect(readDailyBriefCache()).toBeNull();
  });

  it("round-trips a written view model", () => {
    const viewModel = fixture();
    writeDailyBriefCache(viewModel);
    expect(readDailyBriefCache()).toEqual(viewModel);
  });

  it("returns null once the entry is older than the freshness window", () => {
    writeDailyBriefCache(fixture());
    const raw = JSON.parse(sessionStorage.getItem(CACHE_KEY)!);
    raw.savedAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago, older than the 5-minute window
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(raw));

    expect(readDailyBriefCache()).toBeNull();
  });

  it("returns null instead of throwing on corrupted JSON", () => {
    sessionStorage.setItem(CACHE_KEY, "{not valid json");
    expect(readDailyBriefCache()).toBeNull();
  });

  it("does not throw when sessionStorage.getItem itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readDailyBriefCache()).toBeNull();
  });

  it("does not throw when sessionStorage.setItem itself throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeDailyBriefCache(fixture())).not.toThrow();
  });
});
