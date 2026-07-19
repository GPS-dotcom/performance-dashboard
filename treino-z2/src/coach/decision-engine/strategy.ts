import type { TrainingDecisionAction } from "../types/trainingDecision";
import type { TrainingSignals } from "../types/signals";

/**
 * Strategy Pattern (explicitly requested: "Utilizar Strategy Pattern para
 * regras de decisão"). Each concrete strategy in `strategies/` encodes
 * one training-load decision rule as an object satisfying this interface;
 * `trainingDecisionEngine.ts` holds an ordered list of them and picks the
 * first whose `appliesTo` returns true -- adding, removing or reordering
 * a rule never touches the engine itself, only the strategy list.
 */
export interface StrategyDecision {
  action: TrainingDecisionAction;
  reasoning: string;
  supportingMetrics: string[];
  /** 0-1. */
  confidence: number;
}

export interface TrainingDecisionStrategy {
  /** Stable, human-readable name -- carried into TrainingDecision.strategyUsed so the decision is traceable to the exact rule that made it. */
  readonly name: string;
  appliesTo(signals: TrainingSignals): boolean;
  decide(signals: TrainingSignals): StrategyDecision;
}
