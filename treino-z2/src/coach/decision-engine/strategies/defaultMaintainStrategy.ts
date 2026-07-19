import { generalConfidence } from "../../validators/confidenceFormula";
import type { TrainingDecisionStrategy } from "../strategy";

/** Tier 7 (fallback): always applies -- guarantees the engine always returns a decision. */
export const defaultMaintainStrategy: TrainingDecisionStrategy = {
  name: "default_maintain",
  appliesTo: () => true,
  decide: () => ({
    action: "maintain_load",
    reasoning: "No strong signal in either direction -- maintaining current load is the safe default.",
    supportingMetrics: [],
    confidence: generalConfidence(0),
  }),
};
