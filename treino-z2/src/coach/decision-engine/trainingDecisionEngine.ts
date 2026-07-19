import {
  criticalFatigueRecoveryStrategy,
  defaultMaintainStrategy,
  goodRecoveryMaintainStrategy,
  highRecoveryIncreaseStrategy,
  injuryRiskRestStrategy,
  lowRecoveryReduceStrategy,
  risingFatigueReduceStrategy,
} from "./strategies";
import type { TrainingDecisionStrategy } from "./strategy";
import type { TrainingDecision } from "../types/trainingDecision";
import type { TrainingSignals } from "../types/signals";

/**
 * Training Decision Engine: "Decidir automaticamente se o atleta deve:
 * aumentar carga, manter carga, reduzir carga, realizar recuperação,
 * descansar completamente." Holds an ordered list of
 * `TrainingDecisionStrategy` objects (Strategy Pattern) and returns the
 * first one whose `appliesTo` matches -- `defaultMaintainStrategy` always
 * applies, so a decision is always returned. Order encodes priority:
 * injury risk always wins over everything else, then critical fatigue,
 * then the two exact worked examples from the spec, then general
 * recovery-based tiers, then the safe default.
 */
const STRATEGIES: TrainingDecisionStrategy[] = [
  injuryRiskRestStrategy,
  criticalFatigueRecoveryStrategy,
  risingFatigueReduceStrategy,
  lowRecoveryReduceStrategy,
  highRecoveryIncreaseStrategy,
  goodRecoveryMaintainStrategy,
  defaultMaintainStrategy,
];

export function decideTrainingAction(signals: TrainingSignals, generatedAt: string): TrainingDecision {
  const strategy = STRATEGIES.find((s) => s.appliesTo(signals)) ?? defaultMaintainStrategy;
  const result = strategy.decide(signals);

  return {
    id: `decision:${result.action}:${generatedAt.slice(0, 10)}`,
    action: result.action,
    reasoning: result.reasoning,
    supportingMetrics: result.supportingMetrics,
    confidence: result.confidence,
    strategyUsed: strategy.name,
    generatedAt,
  };
}
