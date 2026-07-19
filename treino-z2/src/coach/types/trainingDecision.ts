// Training Decision Engine's output. "Decidir automaticamente se o
// atleta deve: aumentar carga, manter carga, reduzir carga, realizar
// recuperação, descansar completamente" -- a coarse, 5-way load call,
// distinct from (and consumed alongside) the Intensity Recommendation's
// specific workout-type suggestion (Easy Run, Threshold, ...).

export type TrainingDecisionAction = "increase_load" | "maintain_load" | "reduce_load" | "active_recovery" | "full_rest";

export interface TrainingDecision {
  id: string;
  action: TrainingDecisionAction;
  reasoning: string;
  supportingMetrics: string[];
  /** 0-1. */
  confidence: number;
  /** Name of the Strategy (decision-engine/strategies/*.ts) that produced this decision -- Strategy Pattern transparency, so the decision is never a black box. */
  strategyUsed: string;
  generatedAt: string;
}
