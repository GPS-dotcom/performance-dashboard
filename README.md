# performance-dashboard

Two things live in this repo:

- **`index.html`** — the original single-athlete "GPS → Chicago 2026"
  marathon training dashboard. Single static file, React/Chart.js/Supabase
  via CDN script tags, no build step. Reads real synced data from the
  `strava_activities` and `daily_pmc` Supabase tables.

- **`treino-z2/`** — the start of **Treino Z2**, a multi-athlete AI-first
  endurance coaching platform per the product spec. A proper Vite + React +
  TypeScript project with a tested metrics-calculation module, a Supabase
  repository layer, and a dashboard UI. See
  [`treino-z2/README` setup below](#running-treino-z2) and
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture
  reference (condensed from the original spec).

## Running Treino Z2

```bash
cd treino-z2
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
npm test                # vitest — metrics engine + dashboard tests
npm run build
```

It currently reads from the same `strava_activities` / `daily_pmc` tables
as the legacy dashboard (via an adapter in
`src/infrastructure/activityRepository.ts`) so it works against real data
immediately. `supabase/migrations/0001_treino_z2_core_schema.sql` defines
the target multi-athlete schema (Athlete/Activity/Workout/Metrics
Snapshot/Insight, with Row Level Security) for when this grows beyond one
hardcoded athlete — it has **not** been applied to the database yet.
