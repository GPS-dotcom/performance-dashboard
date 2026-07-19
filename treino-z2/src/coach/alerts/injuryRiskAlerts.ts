import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

/** "risco de lesão" -- elevated injury risk from the Prediction Engine's injury risk prediction. */
export function detectInjuryRiskAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  if (signals.injuryRiskLevel !== "high") return null;

  return AlertFactory.create({
    category: "injury_risk",
    kind: "high_injury_risk",
    severity: "critical",
    title: "High Injury Risk",
    description: "Injury risk is elevated based on current training load.",
    actionRequired: "Reduce load or take a rest day until risk returns to a safe range.",
    generatedAt,
  });
}
