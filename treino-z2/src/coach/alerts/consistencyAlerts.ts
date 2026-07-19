import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

/** "perda de consistência" -- a "Reduced Consistency" Insight from the Intelligence Engine, passed through as a flag rather than recomputed here. */
export function detectConsistencyLossAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  if (!signals.consistencyDeclining) return null;

  return AlertFactory.create({
    category: "consistency_loss",
    kind: "reduced_consistency",
    severity: "warning",
    title: "Reduced Training Consistency",
    description: signals.missedWeeksEvidence ?? "Training consistency has declined recently.",
    actionRequired: "Identify what's interrupting the schedule and plan around it before it compounds.",
    generatedAt,
  });
}
