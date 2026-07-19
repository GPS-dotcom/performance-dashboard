import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

/** "queda de performance" -- a high-confidence declining-trend Insight from the Intelligence Engine, passed through as a boolean flag rather than recomputed here. */
export function detectPerformanceDropAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  if (!signals.performanceTrendDeclining) return null;

  return AlertFactory.create({
    category: "performance_drop",
    kind: "rapid_performance_drop",
    severity: "warning",
    title: "Rapid Performance Drop",
    description: "A key performance metric is trending downward with high confidence.",
    actionRequired: "Review recent training load and recovery for a likely cause.",
    generatedAt,
  });
}
