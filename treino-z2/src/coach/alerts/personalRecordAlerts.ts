import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

/** "recordes pessoais" -- the only positive/informational alert category: a new personal best, surfaced from the Intelligence Engine's Performance Analyzer output rather than recomputed here. */
export function detectPersonalRecordAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  if (!signals.newPersonalBest) return null;
  const { distanceLabel, timeSec } = signals.newPersonalBest;

  return AlertFactory.create({
    category: "personal_record",
    kind: "new_personal_best",
    severity: "info",
    title: "New Personal Best!",
    description: `New best effort at ${distanceLabel}: ${timeSec.toFixed(0)}s.`,
    actionRequired: null,
    generatedAt,
    idSuffix: distanceLabel,
  });
}
