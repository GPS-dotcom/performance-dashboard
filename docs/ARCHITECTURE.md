# Treino Z2 / Performance OS — Architecture Reference

Condensed reference distilled from the full `Performance.MD` specification
(a 236-page, 25-document set: `00_PRODUCT_VISION.md` through
`24_DECISION_LOG.md`, plus a `README.md`). That original document is not
stored in this repo; this file summarizes it for day-to-day engineering
reference. Go back to the source document for full detail on any section.

## Vision

> Turn data into knowledge.

Performance OS is an AI-first operating system for endurance athletes
(runners, cyclists, triathletes today; swimming/trail/MTB/ultra later). It
is not a metrics dashboard — every screen should answer a question, every
recommendation must be evidence-based and explainable, and every prediction
must show its reasoning. The system starts from coaching decisions, not
data: "What better coaching decision does this enable?" is the bar every
feature must clear.

Core philosophy:
- Data is not the product — knowledge is.
- Charts are not the goal — better decisions are.
- The AI explains, recommends, compares, teaches and predicts. It never
  calculates physiological metrics itself (those stay deterministic).

## Platform architecture

Each engine owns exactly one business capability. No engine duplicates
another's responsibility, and engines communicate through contracts, not
direct dependencies.

```
External Providers (Garmin, Strava, TrainingPeaks, Whoop, Oura, ...)
        │
        ▼
   Sync Engine        — imports/validates/normalizes external data (only
        │                component allowed to talk to third-party APIs)
        ▼
  Activity Engine      — single source of truth for raw activities;
        │                immutable once stored
        ▼
   Metrics Engine      — calculates physiological metrics only (CTL/ATL/TSB,
        │                LT1/LT2, Critical Power, HR Drift, Running
        │                Effectiveness, ...). Never interprets or coaches.
        ▼
 Intelligence Engine    — interprets metrics in context: trends, insights,
        │                risk detection, personalization
        ▼
  Prediction Engine     — forecasts future performance (race times, FTP,
        │                recovery, injury risk, race readiness)
        ▼
    Coach Engine        — turns everything into personalized, explainable
        │                recommendations; generates the "Daily Brief"
        ▼
    API Layer  →  Frontend
```

Guiding principles across all engines: Single Source of Truth,
Engine-Based Architecture, AI First, Evidence First, Explainable
Recommendations, Immutable Historical Data, Mobile First, Modular Design,
Privacy by Design.

## Core entities (database)

The database stores facts; business intelligence belongs to the Metrics
and Intelligence Engines. Historical data (activities) is immutable —
derived data is recalculated separately, never overwritten in place.

- **User** — auth/account ownership.
- **Athlete** — physiological profile (birthday, sex, height, weight, FTP,
  VO2max, max/resting HR, threshold pace/power, preferred units).
- **Device** — connected wearables (Garmin, Coros, Polar, Stryd, Whoop,
  Oura, Apple Watch, ...).
- **Activity** — raw imported session, never modified after import.
- **Workout** — a *scheduled* session (status: planned/completed/
  skipped/modified/cancelled), distinct from the Activity it may produce.
- **Workout Step** — structured intervals within a workout (warmup, Z2,
  threshold, VO2, sprint, cooldown).
- **Training Plan** — long-term periodization (base/build/peak/taper/
  maintenance).
- **Goal** — target races/efforts (5K through marathon, cycling FTP,
  ultra).
- **Metrics Snapshot** — calculated Metrics Engine output for a date (CTL,
  ATL, TSB, training load, fitness, running economy, efficiency factor,
  decoupling). Not raw sensor data.
- **Recovery Snapshot** — sleep, HRV, resting HR, recovery score,
  readiness, stress.
- **Prediction** — race/FTP/VO2/injury-risk/performance-trend forecasts.
- **Insight** — Intelligence Engine output; always carries confidence,
  explanation, severity, source metrics and a recommendation.
- **Notification**, **AI Conversation** — delivery and coaching-chat
  history.

Relationships flow: `User → Athlete → Activities → Metrics → Insights →
Notifications`, and separately `Goal → Training Plan → Scheduled Workouts`.

## Metrics Engine categories

Performance (VO2max, Critical Power/Speed, FTP, threshold pace/HR, race
equivalents, running economy, efficiency factor, normalized power, GAP,
VDOT, power-duration curve, best efforts) · Training Load (TSS/rTSS/hrTSS,
CTL/ATL/TSB, acute/chronic load, monotony, strain) · Cardiovascular (HR
drift, HRR, time-in-zone, aerobic decoupling, cardiac efficiency) ·
Running-specific and Cycling-specific metrics · Recovery (sleep, HRV,
body battery, readiness) · Consistency (frequency, compliance, streaks).

Design rules: deterministic, stateless, pure calculations, versioned
algorithms, fully testable, explainable outputs. Every calculated metric
should expose `confidence`, `data_quality`, `required_inputs` and
`missing_inputs`. Recalculation is triggered by: workout imported/edited,
threshold or FTP updated, weight updated, historical import.

## Intelligence & Coach Engines

The Intelligence Engine evaluates four coaching domains — Training,
Recovery, Performance, Injury Prevention, Race Intelligence — and every
recommendation must answer: *Why? Based on which metrics? What evidence
supports it? What happens if ignored? What are the alternatives?*

The Coach Engine is the decision-making layer: "Given everything known
about this athlete today, what is the best decision to maximize long-term
performance?" It is explicitly *not* a chatbot — it's a digital endurance
coach, and its primary UI surface is the **Daily Brief** (the spec chose
a Daily Brief over a traditional metrics dashboard as the home screen,
specifically to reduce cognitive load — see Decision DEC-0004).

## Security

Supabase Auth · Row Level Security on every table · JWT + refresh tokens ·
HTTPS everywhere · encrypted secrets · least privilege · audit logs ·
immutable historical data.

## Technology stack (per the spec's README)

**Current:** React, Supabase, PostgreSQL, Supabase Auth, Strava API,
Chart.js — this matches what the existing single-athlete dashboard
(`index.html`) and the new `treino-z2/` MVP already use.

**Future:** background workers, edge functions, Redis, ML models, wearable
integrations beyond Strava.

## What exists in this repo today vs. what's still spec-only

- `index.html` — the original single-athlete "GPS → Chicago 2026" marathon
  dashboard. Reads real data from the existing Supabase tables
  `strava_activities` and `daily_pmc`. Still the production dashboard for
  that one athlete.
- `treino-z2/` — a new Vite + React + TypeScript MVP: a `metricsEngine`
  domain module (zone classification, weekly summaries, latest fitness
  snapshot — unit tested), a repository layer that adapts the existing
  `strava_activities`/`daily_pmc` tables into spec-named domain types, and
  a Dashboard UI (KPIs, activity list, fitness trend). It deliberately
  reuses the existing Supabase project/tables rather than the new schema
  below, so it works against real data as soon as `.env` is configured.
- `supabase/migrations/0001_treino_z2_core_schema.sql` — the multi-athlete
  schema (Athlete/Activity/Workout/Metrics Snapshot/Insight) described
  above, with RLS. **Not applied** to the live database yet — it's the
  target schema for when this grows beyond a single hardcoded athlete.
- Everything else in the spec (Sync/Prediction/Coach Engines, AI Assistant,
  Daily Brief, Insights Library, Design System, multi-provider
  integrations, ...) is documentation only — not yet implemented.
