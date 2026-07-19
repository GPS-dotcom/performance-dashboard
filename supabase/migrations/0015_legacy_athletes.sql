-- Minimal `athletes` table for projects that only ran the legacy schema
-- (migration 0013 -- strava_activities/daily_pmc) and never ran the
-- multi-athlete spec migrations (0001+, where `athletes.user_id` is a
-- NOT NULL FK to auth.users). This app has no sign-in flow (PROJECT_AUDIT.md),
-- so this version drops that FK requirement and self-generates `id` --
-- exactly the columns treino-z2/src/dashboard/services/athleteProfileService.ts
-- and supabase/functions/strava-sync/index.ts read/write, nothing more.
--
-- If this project later runs the full 0001+ migration set, that migration's
-- `create table athletes (...)` will conflict with this one -- drop this
-- table first (after migrating any data you want to keep) in that case.
create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  birthday date,
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric,
  weight_kg numeric,
  ftp integer,
  vo2max numeric,
  max_hr integer,
  resting_hr integer,
  threshold_pace_sec_per_km integer,
  threshold_power integer,
  threshold_heart_rate integer,
  preferred_units text not null default 'metric' check (preferred_units in ('metric', 'imperial')),
  created_at timestamptz not null default now()
);

alter table athletes enable row level security;

create policy "Anyone can read athletes" on athletes
  for select using (true);
