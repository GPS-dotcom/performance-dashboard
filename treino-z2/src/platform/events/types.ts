// Platform Event Bus -- the typed catalog of every event that flows
// between the core Engines, the Dashboard, and plugins (FASE 2). Adding a
// new event type means adding one line here; nothing else in the bus
// needs to change (open/closed by construction).
//
// Payloads carry ids and already-computed values, never live Engine
// objects -- an event is a fact that happened, not a handle back into the
// Engine that produced it. This keeps a subscriber (plugin or otherwise)
// from reaching back into core internals through an event payload.

export interface ActivityImportedEvent {
  activityId: string | number;
  athleteId: string | null;
  startDate: string;
  distanceM: number | null;
}

export interface MetricsCalculatedEvent {
  athleteId: string | null;
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface PredictionGeneratedEvent {
  athleteId: string | null;
  predictionId: string;
  predictionType: string;
  confidence: number;
}

export interface RecommendationCreatedEvent {
  athleteId: string | null;
  recommendationId: string;
  recommendationType: string;
  priority: number;
}

export interface RaceCompletedEvent {
  athleteId: string | null;
  activityId: string | number;
  distanceKm: number;
  timeSec: number;
}

export interface ShoeRetiredEvent {
  athleteId: string | null;
  shoeName: string;
  totalDistanceKm: number;
  retiredAt: string;
}

export interface PluginInstalledEvent {
  pluginId: string;
  version: string;
}

export interface PluginEnabledEvent {
  pluginId: string;
}

export interface PluginDisabledEvent {
  pluginId: string;
}

export interface PluginUninstalledEvent {
  pluginId: string;
}

export interface PluginErrorEvent {
  pluginId: string;
  message: string;
}

/**
 * Every event type the platform knows about, keyed by its name. `EventBus`
 * is generic over a map exactly like this one, so a plugin importing the
 * SDK's own `PlatformEventMap` gets full autocomplete + payload type
 * checking on `subscribe`/`publish` -- the same pattern DOM's own
 * `addEventListener<K extends keyof HTMLElementEventMap>` uses.
 */
export interface PlatformEventMap {
  ActivityImported: ActivityImportedEvent;
  MetricsCalculated: MetricsCalculatedEvent;
  PredictionGenerated: PredictionGeneratedEvent;
  RecommendationCreated: RecommendationCreatedEvent;
  RaceCompleted: RaceCompletedEvent;
  ShoeRetired: ShoeRetiredEvent;
  PluginInstalled: PluginInstalledEvent;
  PluginEnabled: PluginEnabledEvent;
  PluginDisabled: PluginDisabledEvent;
  PluginUninstalled: PluginUninstalledEvent;
  PluginError: PluginErrorEvent;
}

export type PlatformEventType = keyof PlatformEventMap;
