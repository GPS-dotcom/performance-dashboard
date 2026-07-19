import type { ConfidenceLevel } from "../types/insight";

// 19_INSIGHTS_LIBRARY.md: "Confidence Levels: Very High, High, Moderate,
// Low. Every insight must expose its confidence level." Every
// analyzer/detector computes a raw 0-1 confidence number; this is the one
// place that maps it to the spec's 4-level bucket, so the thresholds
// exist in exactly one place.
export function confidenceLevelFor(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return "very_high";
  if (confidence >= 0.65) return "high";
  if (confidence >= 0.4) return "moderate";
  return "low";
}
