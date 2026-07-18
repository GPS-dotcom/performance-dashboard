-- Treino Z2 triggers and audit log
--
-- Three concerns, per docs/ARCHITECTURE.md:
--   1. `updated_at` maintained automatically instead of relying on every
--      caller to set it correctly.
--   2. "Soft Delete Policy: Never delete: Activities, Metrics, Insights,
--      Predictions. Only archive." -- enforced at the DB level, not just
--      by convention, via a trigger that blocks hard DELETE on those four
--      tables. (`archived_at` columns were added to them in 0002.)
--   3. "Audit Strategy: every critical mutation generates an audit event.
--      Examples: Workout edited, FTP changed, Goal changed, Threshold
--      updated." -- a generic audit_log table + trigger applied to
--      athletes (FTP/threshold/weight live there), workouts and goals.
--
-- NOT APPLIED AUTOMATICALLY -- see 0001-0003 for why (no DB execution
-- access from this session). Purely additive, no drops, no data touched.

-- ── 1. updated_at maintenance ────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger athletes_set_updated_at
  before update on athletes
  for each row execute function set_updated_at();

create trigger workouts_set_updated_at
  before update on workouts
  for each row execute function set_updated_at();

create trigger training_plans_set_updated_at
  before update on training_plans
  for each row execute function set_updated_at();

create trigger goals_set_updated_at
  before update on goals
  for each row execute function set_updated_at();

create trigger ai_conversations_set_updated_at
  before update on ai_conversations
  for each row execute function set_updated_at();

-- ── 2. Block hard delete on data the spec says must only be archived ────

create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Hard delete is not allowed on table "%". Set archived_at instead (see docs/ARCHITECTURE.md, Soft Delete Policy).',
    TG_TABLE_NAME;
end;
$$;

create trigger activities_prevent_hard_delete
  before delete on activities
  for each row execute function prevent_hard_delete();

create trigger metrics_snapshots_prevent_hard_delete
  before delete on metrics_snapshots
  for each row execute function prevent_hard_delete();

create trigger insights_prevent_hard_delete
  before delete on insights
  for each row execute function prevent_hard_delete();

create trigger predictions_prevent_hard_delete
  before delete on predictions
  for each row execute function prevent_hard_delete();

-- ── 3. Audit log for critical mutations ──────────────────────────────────

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_fields jsonb,
  actor uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists audit_log_athlete_idx on audit_log (athlete_id, changed_at desc);

alter table audit_log enable row level security;

create policy "Athletes read their own audit log" on audit_log
  for select using (athlete_id in (select id from athletes where user_id = auth.uid()));

-- Athletes never get an INSERT/UPDATE/DELETE policy on audit_log -- rows
-- are only ever written by log_audit_event() below, which runs as
-- `security definer` (the function owner's privileges, not the calling
-- athlete's), so it isn't blocked by the RLS policy above.

create or replace function log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
  v_changed jsonb;
begin
  if TG_TABLE_NAME = 'athletes' then
    v_athlete_id := new.id;
  else
    v_athlete_id := new.athlete_id;
  end if;

  select jsonb_object_agg(o.key, jsonb_build_object('old', o.value, 'new', n.value))
  into v_changed
  from jsonb_each(to_jsonb(old)) as o
  join jsonb_each(to_jsonb(new)) as n using (key)
  where o.value is distinct from n.value;

  if v_changed is not null then
    insert into audit_log (athlete_id, entity_type, entity_id, action, changed_fields, actor)
    values (v_athlete_id, TG_TABLE_NAME, new.id, 'update', v_changed, auth.uid());
  end if;

  return new;
end;
$$;

create trigger athletes_audit_update
  after update on athletes
  for each row execute function log_audit_event();

create trigger workouts_audit_update
  after update on workouts
  for each row execute function log_audit_event();

create trigger goals_audit_update
  after update on goals
  for each row execute function log_audit_event();
