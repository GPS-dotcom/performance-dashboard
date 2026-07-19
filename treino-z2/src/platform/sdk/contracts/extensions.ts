import type { ReactNode } from "react";

// The 7 extension contracts FASE 4 asks for. Each is deliberately narrow
// -- a plugin implementing one of these never gets a handle back into a
// core Engine; it only ever receives already-computed, already-public
// data as a plain argument (mirrors how Metrics/Intelligence/Prediction/
// Coach Engines pass data between themselves via typed envelopes, never
// shared mutable state).

export interface IDashboardPageExtension {
  id: string;
  /** Nav label shown next to the core 8 pages. */
  navLabel: string;
  /** Hash-route suffix, e.g. "plugin-my-page" -- validated by the manager to never collide with a core route. */
  route: string;
  render(): ReactNode;
}

/** Named slots the host exposes for plugin widgets -- kept as a closed union so "where can a widget go" stays host-controlled, not plugin-controlled. */
export type WidgetSlot = "home" | "settings" | "coach";

export interface IWidgetExtension {
  id: string;
  title: string;
  slot: WidgetSlot;
  render(): ReactNode;
}

export interface MetricExtensionInput {
  activities: unknown[];
  metricsHistory: unknown[];
}

export interface MetricExtensionResult {
  label: string;
  value: number | string | null;
  unit?: string;
}

/** A plugin-computed, presentation-adjacent metric -- explicitly not a physiological ground-truth metric (only the Metrics Engine produces those). */
export interface IMetricExtension {
  id: string;
  label: string;
  compute(input: MetricExtensionInput): MetricExtensionResult;
}

export interface PluginInsight {
  title: string;
  description: string;
  severity: "information" | "positive" | "warning" | "critical";
  confidence: number;
}

export interface InsightExtensionInput {
  activities: unknown[];
  metricsHistory: unknown[];
}

/** A plugin-sourced insight, kept in its own stream (never silently merged into the Intelligence Engine's own `Insight[]`) -- see extensions/insightExtensionPoint.ts. */
export interface IInsightExtension {
  id: string;
  analyze(input: InsightExtensionInput): PluginInsight[];
}

export interface PluginRecommendation {
  title: string;
  description: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface RecommendationExtensionInput {
  activities: unknown[];
  metricsHistory: unknown[];
}

/** A plugin-sourced recommendation, kept in its own stream (never silently merged into the Coach Engine's own `Recommendation[]`) -- see extensions/recommendationExtensionPoint.ts. */
export interface IRecommendationExtension {
  id: string;
  recommend(input: RecommendationExtensionInput): PluginRecommendation[];
}

export type IntegrationStatus = "connected" | "disconnected" | "error";

/** A third-party data source/service a plugin bridges in (e.g. a wearable not natively supported). Requires the "network:external" permission scope. */
export interface IIntegrationExtension {
  id: string;
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  status(): IntegrationStatus;
}

/** A command the (future) AI Conversational Assistant can invoke by name -- see docs/ARCHITECTURE.md's roadmap. Kept string-in/string-out so it has no compile-time coupling to a not-yet-built assistant module. */
export interface IAiCommandExtension {
  id: string;
  command: string;
  description: string;
  run(args: string): Promise<string>;
}
