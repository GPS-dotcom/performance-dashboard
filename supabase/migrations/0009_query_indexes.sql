-- Indexes for the two queries the Daily Brief actually runs on every load.
--
-- `strava_activities` and `daily_pmc` are the legacy, never-versioned
-- tables described in PROJECT_AUDIT.md ("schema implicito, nunca
-- versionado neste repo") -- this migration does not assert or alter
-- their column definitions, only adds indexes on the two columns the app
-- already filters/sorts by in production (services/activityService.ts):
--
--   SELECT ... FROM strava_activities ORDER BY start_date DESC LIMIT 200
--   SELECT ... FROM daily_pmc WHERE date >= $cutoff ORDER BY date ASC
--
-- Without an index, both run as a full sequential scan + sort that gets
-- slower as the athlete's history grows. `IF NOT EXISTS` makes this safe
-- to apply even if an equivalent index already exists.
--
-- Not CONCURRENTLY: every other migration in this repo runs as a single
-- transactional file (matching how they're applied -- see 0001-0008's
-- "NOT applied automatically" notes), and CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction. On a very large production
-- `strava_activities` table, an operator may prefer to run the
-- CONCURRENTLY form of these two statements by hand outside a
-- transaction to avoid a brief write lock; documented here rather than
-- assumed.
--
-- Purely additive. No drops, no data touched. NOT applied automatically --
-- same situation as 0001-0008. Verified against a local PostgreSQL 16
-- instance before commit.

create index if not exists strava_activities_start_date_idx
  on strava_activities (start_date desc);

create index if not exists daily_pmc_date_idx
  on daily_pmc (date);

-- goals_athlete_idx (0002) covers (athlete_id, status) but every current
-- query against `goals` (fetchUpcomingGoal) filters by status/target_date
-- without an athlete_id predicate -- this is a single-athlete deployment
-- today, per PROJECT_AUDIT.md. Add the index that actually matches that
-- query shape: WHERE status = 'active' AND target_date >= $today ORDER BY
-- target_date ASC.
create index if not exists goals_status_target_date_idx
  on goals (status, target_date);
