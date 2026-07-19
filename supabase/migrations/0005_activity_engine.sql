-- Activity Engine schema
--
-- Per 06_ACTIVITY_ENGINE.md: the Activity Engine is the single source of
-- truth for activities, laps and records. It owns these entities; no other
-- engine may modify them. This migration adds what 0001/0002 didn't cover:
--   - the full Activity Structure fields the doc specifies (pace, power,
--     cadence, elevation, equipment, route) beyond the minimal set 0001
--     had.
--   - `laps` and `records` as their own owned, immutable entities ("Laps
--     are immutable." / "Records are immutable." -- stricter than
--     Activities itself, which 0004 already allows UPDATE on for
--     legitimate backfill, just not DELETE).
--   - `activity_events` -- a durable log of the events the doc says the
--     Activity Engine publishes (Activity Created/Updated/Archived/
--     Validation Failed), so downstream engines and traceability/logging
--     requirements ("All processing steps must be traceable") have
--     something durable to read, independent of any single browser tab's
--     in-process event bus.
--
-- Purely additive. No drops, no data touched. NOT applied automatically --
-- same situation as 0001-0004 (no live DB connectivity or DDL credentials
-- from this session). Run via the Supabase SQL editor or `supabase db push`.

-- ── Activity Structure: fields 0001 didn't have ─────────────────────────

alter table activities add column if not exists status text not null default 'imported'
  check (status in ('imported', 'validated', 'processed', 'archived', 'failed'));
alter table activities add column if not exists description text;
alter table activities add column if not exists timezone text;
alter table activities add column if not exists average_pace_sec_per_km numeric;
alter table activities add column if not exists best_pace_sec_per_km numeric;
alter table activities add column if not exists max_power numeric;
alter table activities add column if not exists average_cadence numeric;
alter table activities add column if not exists max_cadence numeric;
alter table activities add column if not exists elevation_gain_m numeric;
alter table activities add column if not exists elevation_loss_m numeric;
alter table activities add column if not exists elevation_highest_m numeric;
alter table activities add column if not exists elevation_lowest_m numeric;
alter table activities add column if not exists device_id uuid references devices(id) on delete set null;
alter table activities add column if not exists shoe text;
alter table activities add column if not exists map_polyline text;

-- Keep `status` consistent with the archived_at soft-delete column 0002 added:
-- archiving an activity (setting archived_at) should always be reflected in status,
-- without relying on every caller to remember to set both.
create or replace function sync_activity_archived_status()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and (old.archived_at is null or old.archived_at is distinct from new.archived_at) then
    new.status = 'archived';
  end if;
  return new;
end;
$$;

create trigger activities_sync_archived_status
  before update on activities
  for each row execute function sync_activity_archived_status();

-- ── Laps: immutable, owned by the Activity Engine ────────────────────────

create table if not exists laps (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  lap_number integer not null,
  distance_m numeric,
  duration_s integer,
  pace_sec_per_km numeric,
  power numeric,
  heart_rate numeric,
  cadence numeric,
  elevation_m numeric,
  created_at timestamptz not null default now(),
  unique (activity_id, lap_number)
);
create index if not exists laps_activity_idx on laps (activity_id, lap_number);

-- ── Records: highest-resolution trackpoints, immutable ───────────────────

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  sequence_index integer not null,
  recorded_at timestamptz,
  latitude numeric,
  longitude numeric,
  altitude_m numeric,
  speed_mps numeric,
  pace_sec_per_km numeric,
  power numeric,
  heart_rate numeric,
  cadence numeric,
  unique (activity_id, sequence_index)
);
create index if not exists records_activity_idx on records (activity_id, sequence_index);

-- Laps and records are stricter than Activities: no legitimate backfill
-- scenario applies to them (Strava provides them complete-or-nothing at
-- sync time), so both UPDATE and DELETE are blocked, not just DELETE.
create or replace function prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Table "%" is immutable (per 06_ACTIVITY_ENGINE.md: "% are immutable."). Re-sync the parent activity instead of mutating rows directly.',
    TG_TABLE_NAME, TG_TABLE_NAME;
end;
$$;

create trigger laps_prevent_update
  before update on laps
  for each row execute function prevent_mutation();
create trigger laps_prevent_delete
  before delete on laps
  for each row execute function prevent_mutation();

create trigger records_prevent_update
  before update on records
  for each row execute function prevent_mutation();
create trigger records_prevent_delete
  before delete on records
  for each row execute function prevent_mutation();

-- ── Activity Events: durable log of what the Activity Engine publishes ──

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  event_type text not null check (event_type in (
    'activity_created', 'activity_updated', 'activity_archived',
    'activity_deleted', 'activity_validation_failed'
  )),
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_athlete_created_idx on activity_events (athlete_id, created_at desc);
create index if not exists activity_events_activity_idx on activity_events (activity_id);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table laps enable row level security;
alter table records enable row level security;
alter table activity_events enable row level security;

create policy "Athletes read laps of their own activities" on laps
  for select using (activity_id in (
    select ac.id from activities ac
    join athletes a on a.id = ac.athlete_id
    where a.user_id = auth.uid()
  ));

create policy "Athletes read records of their own activities" on records
  for select using (activity_id in (
    select ac.id from activities ac
    join athletes a on a.id = ac.athlete_id
    where a.user_id = auth.uid()
  ));

create policy "Athletes read their own activity events" on activity_events
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

-- No insert/update/delete policies for laps/records/activity_events: these
-- are written exclusively by the Activity Engine (application code using
-- the athlete's own session, which satisfies the `with check` ownership
-- clauses on `activities` itself already in place) -- laps/records/events
-- are appended alongside an activity the athlete already owns, so an
-- insert policy mirroring the select policy above is required for the
-- engine's own writes to succeed under RLS:

create policy "Athletes insert laps of their own activities" on laps
  for insert with check (activity_id in (
    select ac.id from activities ac
    join athletes a on a.id = ac.athlete_id
    where a.user_id = auth.uid()
  ));

create policy "Athletes insert records of their own activities" on records
  for insert with check (activity_id in (
    select ac.id from activities ac
    join athletes a on a.id = ac.athlete_id
    where a.user_id = auth.uid()
  ));

create policy "Athletes insert their own activity events" on activity_events
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
