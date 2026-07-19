-- Prediction Engine: fix predictions.kind
--
-- 0002_treino_z2_extended_entities.sql defined `predictions.kind` with a
-- CHECK constraint anticipating a set of kinds before the Prediction
-- Engine itself was designed. Now that it's being implemented (race
-- predictions, LT1/LT2 evolution, Critical Power projection, injury risk,
-- recovery time -- see docs/ARCHITECTURE.md and DOMAIN_MODEL.md's
-- "Prediction... Examples: Marathon Time, Half Marathon Time, Critical
-- Power Projection, Injury Risk, Recovery Time"), the original list is
-- missing several of the actual kind values the engine produces.
--
-- Following this repo's convention: migrations are append-only once
-- committed, even though none of them have been applied to a real
-- database yet (no live Supabase connectivity/DDL access from any
-- session so far) -- so this is a new migration, not an edit to 0002.
--
-- Purely additive in effect (only the constraint changes; no columns or
-- data are touched). NOT applied automatically -- same situation as
-- 0001-0006. Verified against a local PostgreSQL 16 instance before
-- commit.

alter table predictions drop constraint if exists predictions_kind_check;
alter table predictions add constraint predictions_kind_check check (kind in (
  'race_prediction',
  'lt1_evolution',
  'lt2_evolution',
  'critical_power_projection',
  'injury_risk',
  'recovery_time',
  'ftp_forecast',
  'vo2_forecast',
  'performance_trend'
));
