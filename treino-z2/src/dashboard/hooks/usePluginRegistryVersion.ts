import { useEffect, useState } from "react";
import { platformEventBus } from "../../platform/events/platformEventBus";

/**
 * The Plugin Manager and extension point registries are plain
 * (non-React) state -- this hook is the bridge: it listens for every
 * plugin lifecycle event on the shared Event Bus and bumps a counter,
 * so any component reading `pluginManager.list()` or
 * `widgetExtensionPoint.list()` re-renders exactly when that data could
 * have changed, without the platform layer knowing anything about React.
 */
export function usePluginRegistryVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const unsubscribers = [
      platformEventBus.subscribe("PluginInstalled", bump),
      platformEventBus.subscribe("PluginEnabled", bump),
      platformEventBus.subscribe("PluginDisabled", bump),
      platformEventBus.subscribe("PluginUninstalled", bump),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return version;
}
