import type { EventHandler, Unsubscribe } from "../../events/eventBus";
import type { PlatformEventMap } from "../../events/types";
import type { PermissionScope } from "./permissions";

/** The event surface a plugin gets -- same shape as EventBus's own subscribe/publish, kept as a narrow interface so a plugin can never call `clear()` on the shared bus. */
export interface PluginEventAccess {
  subscribe<K extends keyof PlatformEventMap>(type: K, handler: EventHandler<PlatformEventMap[K]>): Unsubscribe;
  publish<K extends keyof PlatformEventMap>(type: K, payload: PlatformEventMap[K]): void;
}

/** Per-plugin persisted configuration, scoped so a plugin can only ever read/write its own config, never another plugin's. */
export interface PluginConfigAccess<TConfig = unknown> {
  get(): TConfig | null;
  set(value: TConfig): void;
}

export interface PluginLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * What manager/pluginContextFactory.ts constructs and injects into every
 * lifecycle hook. This is the *entire* surface a plugin has onto the
 * host app -- a plugin never imports `../metrics`, `../coach` etc.
 * directly; it only ever sees what's granted here, which is exactly the
 * inversion-of-dependency FASE 1 asks for ("Toda comunicação ocorre por
 * interfaces e eventos").
 */
export interface PluginContext<TConfig = unknown> {
  pluginId: string;
  /** The permission scopes this plugin was actually granted (a subset of what it requested -- see manager/pluginManager.ts's install()). */
  permissions: readonly PermissionScope[];
  hasPermission(scope: PermissionScope): boolean;
  events: PluginEventAccess;
  config: PluginConfigAccess<TConfig>;
  logger: PluginLogger;
}
