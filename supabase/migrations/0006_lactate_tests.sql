-- Lactate Test raw data
--
-- Per the spec's DOMAIN_MODEL.md (page 39): "Lactate Test -- Represents a
-- physiological assessment. Contains: Stage, Speed, Pace, Heart Rate,
-- Power, Blood Lactate." Owned by the Athlete (raw data), not by the
-- Metrics Engine -- the Metrics Engine only *reads* this to derive LT1/LT2
-- ("Metric... Generated only by the Metrics Engine"), per the DB
-- philosophy: "Store raw data. Calculate intelligence elsewhere."
--
-- Without this table, LT1/LT2 have no real data source in this system --
-- the calculation functions in engines/metrics/lactateThreshold.ts take
-- stage data as a plain argument (kept stateless, per the Metrics Engine's
-- own design rule), and this table is where that stage data actually
-- lives once an athlete records a test.
--
-- Purely additive. No drops, no data touched. NOT applied automatically --
-- same situation as 0001-0005 (no live DB connectivity or DDL credentials
-- from this session). Run via the Supabase SQL editor or `supabase db push`.

create table if not exists lactate_tests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  test_date date not null,
  test_type text not null check (test_type in ('pace', 'power')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists lactate_tests_athlete_idx on lactate_tests (athlete_id, test_date desc);

create table if not exists lactate_test_stages (
  id uuid primary key default gen_random_uuid(),
  lactate_test_id uuid not null references lactate_tests(id) on delete cascade,
  stage_number integer not null,
  speed_mps numeric,
  power_watts numeric,
  heart_rate numeric,
  blood_lactate_mmol numeric not null,
  unique (lactate_test_id, stage_number)
);
create index if not exists lactate_test_stages_test_idx on lactate_test_stages (lactate_test_id, stage_number);

alter table lactate_tests enable row level security;
alter table lactate_test_stages enable row level security;

create policy "Athletes manage their own lactate tests" on lactate_tests
  for all using (athlete_id in (select id from athletes where user_id = auth.uid()))
  with check (athlete_id in (select id from athletes where user_id = auth.uid()));

create policy "Athletes manage stages of their own lactate tests" on lactate_test_stages
  for all using (lactate_test_id in (
    select lt.id from lactate_tests lt
    join athletes a on a.id = lt.athlete_id
    where a.user_id = auth.uid()
  ))
  with check (lactate_test_id in (
    select lt.id from lactate_tests lt
    join athletes a on a.id = lt.athlete_id
    where a.user_id = auth.uid()
  ));
