-- Extends `insights` (0001_treino_z2_core_schema.sql) for the rebuilt
-- Intelligence Engine's richer Insight structure per 19_INSIGHTS_LIBRARY.md's
-- "Insight Structure": "Title, Category, Description, Evidence,
-- Confidence, Severity, Timestamp, Related Metrics, Suggested Action."
--
-- `explanation` (Description) and `source_metrics` (Related Metrics,
-- already jsonb) already exist and are reused as-is -- this only adds
-- the fields that didn't exist yet: title, category, priority (see
-- rules/priorityRules.ts), evidence (an array, distinct from the
-- free-form source_metrics), and a client-generated deterministic id
-- (see insights/insightBuilder.ts) so recalculating the same insight
-- twice upserts instead of duplicating a row.
--
-- Purely additive. No drops, no data touched, no existing column
-- altered. NOT applied automatically -- same situation as 0001-0009.
-- Verified against a local PostgreSQL 16 instance before commit.

alter table insights add column if not exists title text;
alter table insights add column if not exists category text;
alter table insights add column if not exists priority smallint;
alter table insights add column if not exists evidence jsonb;
alter table insights add column if not exists client_insight_id text;

-- Lets the same deterministic insight id be upserted rather than
-- duplicated on recalculation (07_METRICS_ENGINE.md-style
-- "Recalculation Rules" apply here too: activity imported, metrics
-- updated, etc. all re-run analyzers). Deliberately NOT a partial index
-- (`WHERE client_insight_id IS NOT NULL`): Postgres' `ON CONFLICT
-- (columns)` target-inference can't match a partial unique index unless
-- the same WHERE clause is repeated in the ON CONFLICT statement itself,
-- which the Postgrest client library used here has no way to express.
-- A plain unique index works for both cases anyway: legacy rows (NULL
-- client_insight_id) never conflict with each other under standard SQL
-- NULL semantics (a unique index permits any number of NULLs), and every
-- row this engine writes going forward always has a non-null id.
create unique index if not exists insights_athlete_client_id_idx
  on insights (athlete_id, client_insight_id);
