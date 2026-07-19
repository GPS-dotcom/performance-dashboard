-- Coach Engine (full rebuild): richer recommendation/alert envelopes
--
-- Adds the explicit envelope fields the rebuilt Coach Engine
-- (treino-z2/src/coach/) produces for every recommendation and alert:
-- Recommendation<T> gains type/priority/title/description/reasoning/
-- supportingMetrics/supportingInsights/supportingPredictions (see
-- src/coach/types/recommendation.ts); Alert gains
-- category/title/description/actionRequired (see
-- src/coach/types/alert.ts). Both gain a client-generated id for
-- idempotent upserts -- the same pattern as 0010's
-- insights.client_insight_id and 0011's predictions.client_prediction_id.
--
-- Drops recommendations_kind_check (0008: only 'training'|'recovery'|
-- 'race_strategy') and coach_alerts_kind_check/coach_alerts_severity_check
-- (0008: 6 legacy alert kinds, 'warning'|'critical' only): the rebuilt
-- engine's Recommendation has 7 types (recovery, intensity, volume, rest,
-- nutrition, hydration, race_strategy) and its Alert has 6 categories
-- (overtraining_risk, performance_drop, elevated_fatigue, injury_risk,
-- consistency_loss, personal_record) plus a new "info" severity for the
-- positive personal-record case -- all defined and versioned in
-- TypeScript (RecommendationType/AlertCategory/AlertSeverity) rather than
-- duplicated as a SQL enum, matching insights.category (0010) and
-- predictions.category (0011) for the same reason.
--
-- Following this repo's convention: migrations are append-only once
-- committed, even though none have been applied to a live database yet
-- (no live Supabase connectivity/DDL access from any session so far) --
-- so this is a new migration, not an edit to 0008. Purely additive in
-- effect aside from dropping the now-too-narrow CHECK constraints; no
-- existing columns or data are touched. Verified against a local
-- PostgreSQL 16 instance before commit (including the ON CONFLICT upsert
-- path -- see 0010's own note on why the new unique indexes below are
-- plain, non-partial indexes).

alter table recommendations drop constraint if exists recommendations_kind_check;

alter table recommendations add column if not exists type text;
alter table recommendations add column if not exists priority smallint;
alter table recommendations add column if not exists title text;
alter table recommendations add column if not exists description text;
alter table recommendations add column if not exists reasoning text;
alter table recommendations add column if not exists supporting_metrics jsonb;
alter table recommendations add column if not exists supporting_insights jsonb;
alter table recommendations add column if not exists supporting_predictions jsonb;
alter table recommendations add column if not exists client_recommendation_id text;

create unique index if not exists recommendations_athlete_client_id_idx
  on recommendations (athlete_id, client_recommendation_id);

alter table coach_alerts drop constraint if exists coach_alerts_kind_check;
alter table coach_alerts drop constraint if exists coach_alerts_severity_check;
alter table coach_alerts add constraint coach_alerts_severity_check
  check (severity in ('info', 'warning', 'critical'));

alter table coach_alerts add column if not exists category text;
alter table coach_alerts add column if not exists title text;
alter table coach_alerts add column if not exists description text;
alter table coach_alerts add column if not exists action_required text;
alter table coach_alerts add column if not exists client_alert_id text;

create unique index if not exists coach_alerts_athlete_client_id_idx
  on coach_alerts (athlete_id, client_alert_id);
