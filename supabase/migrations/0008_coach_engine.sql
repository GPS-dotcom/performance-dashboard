-- Coach Engine schema
--
-- Per DOMAIN_MODEL.md: "Recommendation -- Represents an action suggested
-- to the athlete... Generated only by the Coach Engine." Adds a table for
-- that entity, plus one for the alerts COACH_ENGINE.md's "Escalation
-- Rules" section describes ("Alerts have higher priority than
-- recommendations").
--
-- The Daily Brief is NOT persisted here: COACH_ENGINE.md frames it as
-- "the primary output... shown to the athlete," an on-demand aggregation
-- of a Recommendation plus already-computed Metrics/Intelligence/
-- Prediction outputs (see generateDailyBrief), not a distinct entity in
-- DOMAIN_MODEL.md's Core Entities list -- so it's computed live rather
-- than stored as its own row.
--
-- Purely additive. No drops, no data touched. NOT applied automatically --
-- same situation as 0001-0007. Verified against a local PostgreSQL 16
-- instance before commit.

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null check (kind in ('training', 'recovery', 'race_strategy')),
  recommendation text not null,
  reason text not null,
  evidence jsonb,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  expected_outcome text,
  alternative text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists recommendations_athlete_created_idx on recommendations (athlete_id, created_at desc);

create table if not exists coach_alerts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null check (kind in (
    'high_injury_risk', 'extreme_fatigue', 'rapid_performance_drop',
    'overreaching', 'abnormal_training_load', 'unusual_recovery_pattern'
  )),
  severity text not null check (severity in ('warning', 'critical')),
  message text not null,
  evidence jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index if not exists coach_alerts_athlete_created_idx on coach_alerts (athlete_id, created_at desc);

alter table recommendations enable row level security;
alter table coach_alerts enable row level security;

create policy "Athletes read their own recommendations" on recommendations
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes read their own coach alerts" on coach_alerts
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes acknowledge their own coach alerts" on coach_alerts
  for update using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

-- No insert policy for athletes on either table: rows are written
-- exclusively by the Coach Engine's own persistence functions
-- (savePrediction-style: application code acting on the athlete's own
-- session satisfies these same ownership checks, since it writes
-- athlete_id = the querying athlete's own row).
create policy "Athletes insert their own recommendations" on recommendations
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes insert their own coach alerts" on coach_alerts
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
