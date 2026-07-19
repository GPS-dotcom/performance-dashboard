// Input shape for the Goal Predictor. Mirrors the `goals` table
// (0002_treino_z2_extended_entities.sql: kind/label/target_date/
// target_value) plus the specific series/current-value data the
// prediction needs -- assembled by the caller (this engine never queries
// the `goals` table itself; that stays in services/goalService.ts,
// consistent with `types/analyzerInputs.ts`'s NamedPeriod pattern in the
// Intelligence Engine, where a caller-assembled input keeps the engine
// decoupled from any one entity's storage shape).

export type GoalKind = "5k" | "10k" | "half_marathon" | "marathon" | "cycling_ftp" | "ultra" | "other";

export interface GoalInput {
  id: string;
  kind: GoalKind;
  label: string | null;
  targetDate: string; // YYYY-MM-DD
  /** Seconds for a race-time goal, watts for an FTP goal; null when the goal has no numeric target. */
  targetValue: number | null;
}
