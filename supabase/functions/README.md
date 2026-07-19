# Sync Engine (Strava)

Two Supabase Edge Functions that pull the athlete's Strava data into
`strava_activities` / `daily_pmc` (the tables `treino-z2` reads from --
see `supabase/migrations/0013_legacy_strava_activities_daily_pmc.sql`) and
`daily_pmc`'s CTL/ATL/TSB (see `supabase/migrations/0014_strava_sync_tokens.sql`).
This is the "Sync Engine" `docs/ARCHITECTURE.md` describes as "the only
component allowed to talk to third-party APIs."

- `strava-oauth-callback/` -- one-time OAuth handshake; stores the access/refresh token in `strava_tokens`.
- `strava-sync/` -- the actual sync job; fetches activities, upserts them, and recomputes CTL/ATL/TSB. Each function is a single self-contained `index.ts` file (the Training Load / CTL / ATL formulas are inlined directly into `strava-sync/index.ts`, kept identical to `treino-z2/src/metrics/calculators/`) -- no shared/relative imports between functions, on purpose, so each one can be deployed by pasting its whole file into the Supabase Dashboard's Edge Function editor, no CLI/terminal required.

## One-time setup

### 1. Create a Strava API application

Go to **strava.com/settings/api**, create an app if you haven't. Note the **Client ID** and **Client Secret**.

### 2. Deploy the two functions

**Option A -- Supabase Dashboard (no terminal needed, works from any browser incl. iPad):**

1. Open your project at supabase.com/dashboard → **Edge Functions** in the left sidebar.
2. Click **Deploy a new function** → choose the option to write code directly in the browser editor (not "via CLI").
3. Name it exactly `strava-oauth-callback`, delete the placeholder code, and paste in the full contents of `supabase/functions/strava-oauth-callback/index.ts` from this repo. Deploy.
4. Repeat: click **Deploy a new function** again, name it exactly `strava-sync`, paste in the full contents of `supabase/functions/strava-sync/index.ts`. Deploy.

**Option B -- Supabase CLI (if you have a terminal):**

From the repo root, with the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in:

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy strava-oauth-callback
supabase functions deploy strava-sync
```

### 3. Set secrets

**Dashboard:** Edge Functions → **Secrets** (or "Manage secrets") → add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` as key/value pairs.

**CLI:**

```bash
supabase secrets set STRAVA_CLIENT_ID=<your client id>
supabase secrets set STRAVA_CLIENT_SECRET=<your client secret>
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase -- you don't set those.)

### 4. Set the Authorization Callback Domain in Strava

In your Strava API app settings, set **Authorization Callback Domain** to your Supabase project's domain, e.g. `<project-ref>.supabase.co` (no `https://`, no path).

### 5. Authorize once

Build this URL with your own Client ID and project ref, then open it in a browser:

```
https://www.strava.com/oauth/authorize?client_id=<your client id>&redirect_uri=https://<project-ref>.supabase.co/functions/v1/strava-oauth-callback&response_type=code&scope=activity:read_all,profile:read_all
```

Approve access. You should land on a page saying "Connected to Strava successfully."

### 6. Run the sync

Manually, any time:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/strava-sync" \
  -H "Authorization: Bearer <your anon or service_role key>"
```

Or open that same URL in a browser (Edge Functions accept GET too via `Deno.serve`'s single handler here).

To run it automatically, use Supabase's **Edge Function Schedules** (Dashboard → Edge Functions → strava-sync → Schedules) or a `pg_cron` job that calls the same URL on an interval (e.g. every 6 hours).

## Optional: Training Load thresholds

`daily_pmc`'s CTL/ATL/TSB can only be computed for a session that has
either (normalized power + FTP) or (average heart rate + threshold heart
rate) -- exactly the same requirement as
`metrics/calculators/trainingLoadCalculator.ts`. Without at least one of
these set, every day's load comes out as 0 (not wrong, just uninformative).

There is no profile-editing UI yet (see `DASHBOARD_REPORT.md`'s
Limitations), so set these directly via SQL once. `athletes.user_id`
requires a real `auth.users` row (Dashboard → Authentication → Users →
Add User), then:

```sql
insert into athletes (user_id, ftp, threshold_heart_rate)
values ('<the auth user''s UUID>', 250, 165) -- adjust to your real numbers
on conflict (user_id) do update set ftp = excluded.ftp, threshold_heart_rate = excluded.threshold_heart_rate;
```

Re-run `strava-sync` afterward to recompute `daily_pmc` with real thresholds.

## Limitations

- `best_efforts` and `zone_minutes` are not populated by this sync -- both need per-activity detail calls (`GET /activities/{id}` and `GET /activities/{id}/streams`) this MVP doesn't make, to stay well under Strava's rate limits (200 req/15min, 2000/day). Race predictions (Predictions page) and zone charts (Metrics page) stay empty until a later iteration adds these.
- `rtss` is not stored per-activity; Training Load is computed directly into `daily_pmc` instead.
- Syncs up to 500 most recent activities per run (5 pages x 100). A first-time athlete with more history than that needs to run the sync more than once, or this cap can be raised in `strava-sync/index.ts`.
- No webhook subscription -- new activities only appear after the next sync run (manual or scheduled), not instantly.
