import type { EventBus } from "../events/eventBus";
import type { PlatformEventMap } from "../events/types";
import type { PermissionScope } from "../sdk/types/permissions";
import type { PluginContext } from "../sdk/types/context";
import type { PluginConfigStore } from "./configStore";

/**
 * Builds the one `PluginContext` a given plugin sees for the whole of
 * its lifecycle -- this is where "isolamento" (FASE 3) actually happens:
 * the returned object closes over `pluginId`, so `context.config.get()`
 * can only ever read *this* plugin's config, and `context.hasPermission`
 * can only ever answer for *this* plugin's granted scopes. Nothing here
 * is shared, mutable state between plugins.
 */
export function createPluginContext<TConfig = unknown>(
  pluginId: string,
  grantedPermissions: readonly PermissionScope[],
  eventBus: EventBus<PlatformEventMap>,
  configStore: PluginConfigStore,
): PluginContext<TConfig> {
  return {
    pluginId,
    permissions: grantedPermissions,
    hasPermission(scope: PermissionScope): boolean {
      return grantedPermissions.includes(scope);
    },
    events: {
      subscribe: (type, handler) => eventBus.subscribe(type, handler),
      publish: (type, payload) => eventBus.publish(type, payload),
    },
    config: {
      get: () => configStore.get<TConfig>(pluginId),
      set: (value: TConfig) => configStore.set(pluginId, value),
    },
    logger: {
      info: (message, ...args) => console.info(`[plugin:${pluginId}]`, message, ...args),
      warn: (message, ...args) => console.warn(`[plugin:${pluginId}]`, message, ...args),
      error: (message, ...args) => console.error(`[plugin:${pluginId}]`, message, ...args),
    },
  };
}
