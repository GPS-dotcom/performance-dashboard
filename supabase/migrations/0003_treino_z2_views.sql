-- Treino Z2 views
--
-- Read-only derived views over the tables from 0001/0002. Nothing here
-- duplicates stored data -- per the DB philosophy in docs/ARCHITECTURE.md
-- ("the database should never contain duplicated derived values"), these
-- are computed at query time, not materialized.
--
-- IMPORTANT: both views are created with `security_invoker = true`
-- (Postgres 15+, supported by Supabase). Without this, a view runs with
-- the permissions of whoever created it (typically a superuser/service
-- role via the SQL editor), which would silently bypass the Row Level
-- Security policies on the underlying tables -- letting any authenticated
-- athlete read every other athlete's data through the view even though
-- the base tables are correctly locked down. `security_invoker = true`
-- makes the view re-check RLS as the querying user, same as querying the
-- table directly.
--
-- NOT APPLIED AUTOMATICALLY -- see 0001/0002 for why (no DB execution
-- access from this session). Purely additive, no drops.

-- One row per athlete: their most recent (non-archived) fitness snapshot.
-- Saves every caller from repeating `order by date desc limit 1`.
create or replace view latest_metrics_snapshot
with (security_invoker = true) as
select distinct on (athlete_id) *
from metrics_snapshots
where archived_at is null
order by athlete_id, date desc;

-- Per-athlete, per-ISO-week training load, matching the "Weekly Load"
-- metric category from docs/ARCHITECTURE.md's Metrics Engine section.
create or replace view weekly_training_load
with (security_invoker = true) as
select
  athlete_id,
  date_trunc('week', start_date)::date as week_start,
  count(*) as activity_count,
  sum(distance_m) as distance_m,
  sum(moving_time_s) as moving_time_s,
  sum(rtss) as total_rtss
from activities
where archived_at is null
group by athlete_id, date_trunc('week', start_date);
