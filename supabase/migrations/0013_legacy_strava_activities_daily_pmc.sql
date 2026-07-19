-- strava_activities / daily_pmc -- the tables the running app actually
-- reads from today.
--
-- treino-z2/src/services/activityService.ts deliberately queries these two
-- tables (not the multi-athlete `activities`/`metrics_snapshots` schema from
-- migration 0001) -- per docs/ARCHITECTURE.md: "It deliberately reuses the
-- existing Supabase project/tables rather than the new schema below, so it
-- works against real data as soon as .env is configured." That existing
-- project (the original single-athlete "GPS -> Chicago 2026" dashboard,
-- index.html) already had these two tables, created directly in the
-- Supabase SQL editor, outside of any migration in this repo -- so no
-- earlier migration ever defines them ("Its schema is unversioned",
-- activityService.ts's own comment). This migration exists purely so a
-- *new* Supabase project (one that never had the original dashboard) has
-- somewhere for the running app to read from.
--
-- Single hardcoded athlete, no `athlete_id`/`user_id` column and no Auth --
-- matches how activityService.ts queries them today (no .eq("athlete_id", ...)
-- anywhere) and how the app connects (PostgrestClient with only the anon
-- key, no Supabase Auth session -- see api/supabaseClient.ts). RLS is
-- enabled with a read-only anon policy so the deployed frontend can select,
-- while writes are expected to come from a sync job using the service role
-- key (which bypasses RLS entirely) -- there is no INSERT/UPDATE policy for
-- anon/authenticated because nothing in this app writes to these tables.
--
-- Purely additive. No drops, no data touched. NOT applied automatically --
-- same situation as every other migration in this repo (no live DB
-- connectivity or DDL credentials from this session). Run via the Supabase
-- SQL editor or `supabase db push`.

create table if not exists strava_activities (
  id bigint primary key,
  name text not null,
  start_date timestamptz not null,
  distance_m numeric,
  moving_time_s integer,
  average_heartrate numeric,
  average_watts numeric,
  weighted_average_watts numeric,
  rtss numeric,
  best_efforts jsonb,
  zone_minutes jsonb,
  created_at timestamptz not null default now()
);
create index if not exists strava_activities_start_date_idx on strava_activities (start_date desc);

create table if not exists daily_pmc (
  date date primary key,
  ctl numeric not null,
  atl numeric not null,
  tsb numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists daily_pmc_date_idx on daily_pmc (date);

alter table strava_activities enable row level security;
alter table daily_pmc enable row level security;

create policy "Anyone can read activities" on strava_activities
  for select using (true);

create policy "Anyone can read daily PMC" on daily_pmc
  for select using (true);
