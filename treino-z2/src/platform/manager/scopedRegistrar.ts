import type { ExtensionPort, ExtensionRegistrar } from "../sdk/contracts/registrar";

export interface ScopedRegistrarHandle {
  /** What a plugin's `onEnable` actually receives -- every `.contribute` call through it is tracked, so `revokeAll()` can undo exactly (and only) what this one plugin added. */
  registrar: ExtensionRegistrar;
  /** Called on disable/uninstall -- removes every contribution this plugin made from the live extension points, in any order. */
  revokeAll(): void;
}

type PortName = keyof ExtensionRegistrar;

function wrapPort<TExtension extends { id: string }>(portName: PortName, port: ExtensionPort<TExtension>, contributed: { port: PortName; id: string }[]): ExtensionPort<TExtension> {
  return {
    contribute(extension: TExtension): void {
      port.contribute(extension);
      contributed.push({ port: portName, id: extension.id });
    },
    revoke(extensionId: string): void {
      port.revoke(extensionId);
      const index = contributed.findIndex((c) => c.port === portName && c.id === extensionId);
      if (index >= 0) contributed.splice(index, 1);
    },
  };
}

/**
 * Wraps the live `ExtensionRegistrar` so every contribution a single
 * plugin makes during its `onEnable` is remembered -- this is what makes
 * `disable()` safe in manager/pluginManager.ts: it can call `revokeAll()`
 * without the plugin having to cooperate (a buggy or malicious plugin
 * that "forgets" to clean up after itself still gets cleaned up).
 */
export function createScopedRegistrar(liveRegistrar: ExtensionRegistrar): ScopedRegistrarHandle {
  const contributed: { port: PortName; id: string }[] = [];

  const registrar: ExtensionRegistrar = {
    dashboardPages: wrapPort("dashboardPages", liveRegistrar.dashboardPages, contributed),
    widgets: wrapPort("widgets", liveRegistrar.widgets, contributed),
    metrics: wrapPort("metrics", liveRegistrar.metrics, contributed),
    insights: wrapPort("insights", liveRegistrar.insights, contributed),
    recommendations: wrapPort("recommendations", liveRegistrar.recommendations, contributed),
    integrations: wrapPort("integrations", liveRegistrar.integrations, contributed),
    aiCommands: wrapPort("aiCommands", liveRegistrar.aiCommands, contributed),
  };

  return {
    registrar,
    revokeAll(): void {
      for (const { port, id } of [...contributed]) {
        liveRegistrar[port].revoke(id);
      }
      contributed.length = 0;
    },
  };
}
