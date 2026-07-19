-- strava_tokens -- OAuth token storage for the Sync Engine
-- (supabase/functions/strava-oauth-callback, supabase/functions/strava-sync).
--
-- Single row (id is fixed to 1 via the check constraint), matching this
-- app's single-hardcoded-athlete model everywhere else. Deliberately has
-- NO row level security policy granting anon/authenticated access --
-- only the service role key (which the Edge Functions use, and which
-- bypasses RLS entirely) can read or write this table. The frontend
-- (anon key only, see api/supabaseClient.ts) must never be able to read
-- an access/refresh token.
--
-- Purely additive. NOT applied automatically -- run via the Supabase SQL
-- editor or `supabase db push`.

create table if not exists strava_tokens (
  id integer primary key default 1 check (id = 1),
  strava_athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null, -- unix seconds, per Strava's OAuth response
  scope text,
  updated_at timestamptz not null default now()
);

alter table strava_tokens enable row level security;
-- No policies: RLS enabled with zero grants means anon/authenticated can
-- never read or write this table under any circumstance, by default-deny.

-- strava-sync (supabase/functions/strava-sync) computes each session's
-- Training Load using the exact same fallback as
-- metrics/calculators/trainingLoadCalculator.ts: power-based TSS when
-- normalized power + FTP are both known, else HR-based TSS when average
-- HR + threshold HR are both known. `athletes.ftp` already exists
-- (migration 0001) but there is no threshold heart rate column anywhere
-- in the schema -- without one, HR-based load can never be computed for
-- an athlete who trains by heart rate rather than power. Added here
-- rather than invented as a formula (e.g. "some % of max_hr") inside the
-- sync function, since the Metrics Engine itself only ever accepts an
-- explicit threshold HR, never derives one.
alter table athletes add column if not exists threshold_heart_rate integer;
