-- Prediction Engine (full rebuild): richer prediction envelope
--
-- Adds the explicit envelope fields the rebuilt Prediction Engine
-- (treino-z2/src/prediction/) produces for every prediction
-- (Prediction<T> in src/prediction/types/prediction.ts): category,
-- lowerBound/upperBound (confidence interval -- "Toda previsão deve
-- possuir intervalo de confiança"), assumptions, supportingInsights,
-- the full structured value (value_json, since not every prediction's
-- `value` is a bare number), expiresAt, and a client-generated id for
-- idempotent upserts (same pattern as 0010's insights.client_insight_id).
--
-- Also drops predictions_kind_check (added in 0007): the rebuilt engine's
-- kind/predictionType taxonomy is ~20 fine-grained values (one per
-- predictor sub-capability, e.g. race_time_5k .. readiness_hard_training),
-- defined and versioned in TypeScript (PredictionType,
-- src/prediction/types/prediction.ts) rather than duplicated as a SQL
-- enum -- matching insights.category/priority (0010), which are also
-- unconstrained free text for the same reason.
--
-- Following this repo's convention: migrations are append-only once
-- committed, even though none have been applied to a live database yet
-- (no live Supabase connectivity/DDL access from any session so far) --
-- so this is a new migration, not an edit to 0002/0007. Purely additive
-- in effect aside from dropping the now-too-narrow kind constraint; no
-- existing columns or data are touched. Verified against a local
-- PostgreSQL 16 instance before commit (including the ON CONFLICT
-- upsert path -- see 0010's own note on why the new unique index below
-- is a plain, non-partial index).

alter table predictions drop constraint if exists predictions_kind_check;

alter table predictions add column if not exists category text;
alter table predictions add column if not exists lower_bound numeric;
alter table predictions add column if not exists upper_bound numeric;
alter table predictions add column if not exists assumptions jsonb;
alter table predictions add column if not exists supporting_insights jsonb;
alter table predictions add column if not exists value_json jsonb;
alter table predictions add column if not exists expires_at timestamptz;
alter table predictions add column if not exists client_prediction_id text;

create unique index if not exists predictions_athlete_client_id_idx
  on predictions (athlete_id, client_prediction_id);
