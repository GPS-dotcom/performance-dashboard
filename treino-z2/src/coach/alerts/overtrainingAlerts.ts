import { AlertFactory } from "./alertFactory";
import type { Alert } from "../types/alert";
import type { AlertSignals } from "../types/signals";

// Beyond the Prediction Engine's own "high injury risk" threshold (1.5) --
// a sustained ACWR this extreme is a distinct, more severe overreaching
// signal (Gabbett, 2016).
const OVERREACHING_ACWR_THRESHOLD = 2.0;
const ABNORMAL_LOW_ACWR_THRESHOLD = 0.5;

/** "risco de overtraining" -- acute load far ahead of chronic capacity (overreaching), or abnormally collapsed relative to recent history. */
export function detectOvertrainingRiskAlert(signals: AlertSignals, generatedAt: string): Alert | null {
  const { acwr } = signals;

  if (acwr != null && acwr > OVERREACHING_ACWR_THRESHOLD) {
    return AlertFactory.create({
      category: "overtraining_risk",
      kind: "overreaching",
      severity: "critical",
      title: "Overreaching",
      description: "Acute training load is far ahead of chronic load -- a strong overreaching signal.",
      actionRequired: "Reduce load significantly for the next several days.",
      generatedAt,
    });
  }

  if (acwr != null && acwr < ABNORMAL_LOW_ACWR_THRESHOLD) {
    return AlertFactory.create({
      category: "overtraining_risk",
      kind: "abnormal_training_load",
      severity: "warning",
      title: "Abnormal Training Load Drop",
      description: "Training load has dropped sharply relative to recent history.",
      actionRequired: "Confirm whether this drop was planned (taper, illness, travel) or unintentional.",
      generatedAt,
    });
  }

  return null;
}
