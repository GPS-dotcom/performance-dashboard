-- Treino Z2 extended entities
--
-- Adds the remaining Core Entities from docs/ARCHITECTURE.md that
-- 0001_treino_z2_core_schema.sql did not cover: Device, Goal, Training
-- Plan, Workout Step, Recovery Snapshot, Prediction, Notification, AI
-- Conversation (+ its messages). Also fixes two gaps found while comparing
-- 0001 against the app's own domain model:
--   - `activities` was missing an `rtss` column, even though every part of
--     the app (index.html, treino-z2/src/types.ts) reads/writes `rtss` on
--     an activity.
--   - `workouts` had no link back to a Training Plan.
--
-- Purely additive: `create table if not exists`, `add column if not
-- exists` only. Never drops or truncates anything. Does not touch
-- `strava_activities` / `daily_pmc` (the legacy dashboard's tables).
--
-- NOT APPLIED AUTOMATICALLY -- same situation as 0001: this session has no
-- database execution access (no live Supabase connectivity, no service
-- role key), so this has not been run or verified against a real database.
-- Run via the Supabase SQL editor or `supabase db push`.

-- ── Fixes to 0001's tables ──────────────────────────────────────────────

alter table activities add column if not exists rtss numeric;
alter table activities add column if not exists archived_at timestamptz;
alter table metrics_snapshots add column if not exists archived_at timestamptz;
alter table insights add column if not exists archived_at timestamptz;

-- ── Device: connected wearables ──────────────────────────────────────────

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  provider text not null check (provider in (
    'garmin', 'coros', 'polar', 'stryd', 'whoop', 'oura', 'apple_watch',
    'strava', 'trainingpeaks', 'runna', 'apple_health', 'google_fit'
  )),
  external_device_id text,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (athlete_id, provider, external_device_id)
);
create index if not exists devices_athlete_idx on devices (athlete_id);

-- ── Goal: target races/efforts ───────────────────────────────────────────

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null check (kind in ('5k', '10k', 'half_marathon', 'marathon', 'cycling_ftp', 'ultra', 'other')),
  label text,
  target_date date,
  target_value numeric, -- seconds for a race time, watts for an FTP goal, etc.
  status text not null default 'active' check (status in ('active', 'achieved', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_athlete_idx on goals (athlete_id, status);

-- ── Training Plan: long-term periodization, downstream of a Goal ────────

create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  name text not null,
  phase text check (phase in ('base', 'build', 'peak', 'taper', 'maintenance')),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_plans_athlete_idx on training_plans (athlete_id, start_date desc);

-- Workout -> Training Plan link (a workout may belong to a plan; 0001 had no such column).
alter table workouts add column if not exists training_plan_id uuid references training_plans(id) on delete set null;
create index if not exists workouts_training_plan_idx on workouts (training_plan_id);

-- ── Workout Step: structured intervals within a workout ─────────────────

create table if not exists workout_steps (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  step_order integer not null,
  kind text not null check (kind in ('warmup', 'z2', 'threshold', 'vo2', 'sprint', 'cooldown', 'rest')),
  duration_s integer,
  distance_m numeric,
  target_pace_sec_per_km numeric,
  target_power integer,
  target_hr integer,
  repeat_count integer,
  unique (workout_id, step_order)
);
create index if not exists workout_steps_workout_idx on workout_steps (workout_id, step_order);

-- ── Recovery Snapshot: sleep/HRV/readiness, one per athlete per day ─────

create table if not exists recovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  date date not null,
  sleep_duration_min integer,
  sleep_quality numeric,
  hrv numeric,
  resting_hr integer,
  recovery_score numeric,
  readiness numeric,
  stress numeric,
  created_at timestamptz not null default now(),
  unique (athlete_id, date)
);
create index if not exists recovery_snapshots_athlete_date_idx on recovery_snapshots (athlete_id, date);

-- ── Prediction: race/FTP/VO2/injury-risk/performance-trend forecasts ────

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null check (kind in ('race_prediction', 'ftp_forecast', 'vo2_forecast', 'injury_risk', 'performance_trend')),
  target_distance_km numeric, -- only meaningful for race_prediction
  predicted_value numeric,
  unit text,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  source_metrics jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists predictions_athlete_created_idx on predictions (athlete_id, created_at desc);

-- ── Notification: delivered to the athlete ───────────────────────────────

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_athlete_created_idx on notifications (athlete_id, created_at desc);

-- ── AI Conversation: coaching chat history ───────────────────────────────

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_athlete_idx on ai_conversations (athlete_id, updated_at desc);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on ai_messages (conversation_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table devices enable row level security;
alter table goals enable row level security;
alter table training_plans enable row level security;
alter table workout_steps enable row level security;
alter table recovery_snapshots enable row level security;
alter table predictions enable row level security;
alter table notifications enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

create policy "Athletes manage their own devices" on devices
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage their own goals" on goals
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage their own training plans" on training_plans
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage steps of their own workouts" on workout_steps
  for all using (workout_id in (
    select w.id from workouts w
    join athletes a on a.id = w.athlete_id
    where a.user_id = auth.uid()
  ))
  with check (workout_id in (
    select w.id from workouts w
    join athletes a on a.id = w.athlete_id
    where a.user_id = auth.uid()
  ));

create policy "Athletes manage their own recovery snapshots" on recovery_snapshots
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes read their own predictions" on predictions
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes read their own notifications" on notifications
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes mark their own notifications read" on notifications
  for update using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage their own AI conversations" on ai_conversations
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage messages in their own AI conversations" on ai_messages
  for all using (conversation_id in (
    select c.id from ai_conversations c
    join athletes a on a.id = c.athlete_id
    where a.user_id = auth.uid()
  ))
  with check (conversation_id in (
    select c.id from ai_conversations c
    join athletes a on a.id = c.athlete_id
    where a.user_id = auth.uid()
  ));
