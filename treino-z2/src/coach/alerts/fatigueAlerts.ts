import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

const EXTREME_FATIGUE_TSB_THRESHOLD = -30;
const EXTREME_FATIGUE_RECOVERY_THRESHOLD = 25;

/** "fadiga elevada" -- extreme fatigue, either from a very negative TSB or a critically low Recovery Score. */
export function detectElevatedFatigueAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  const { tsb, recoveryScore } = signals;

  if (tsb != null && tsb < EXTREME_FATIGUE_TSB_THRESHOLD) {
    return AlertFactory.create({
      category: "elevated_fatigue",
      kind: "extreme_fatigue_tsb",
      severity: "critical",
      title: "Extreme Fatigue",
      description: "Fatigue is extremely high relative to fitness.",
      actionRequired: "Take a full rest day or active recovery day.",
      generatedAt,
    });
  }

  if (recoveryScore != null && recoveryScore < EXTREME_FATIGUE_RECOVERY_THRESHOLD) {
    return AlertFactory.create({
      category: "elevated_fatigue",
      kind: "extreme_fatigue_recovery",
      severity: "warning",
      title: "Critically Low Recovery",
      description: "Recovery is critically low.",
      actionRequired: "Prioritize rest and sleep before the next training session.",
      generatedAt,
    });
  }

  return null;
}
