import type { IPlugin } from "../contracts/plugin";

/**
 * "Registro automático" (FASE 1): a plugin author never manually wires
 * their plugin into a central switch statement. They call `definePlugin`
 * once in their plugin's entry module -- the act of importing that
 * module is what registers it, the same pattern ESLint plugins/Vite
 * plugins/Babel plugins all use (`export default definePlugin({...})`).
 * The Plugin Manager then discovers everything already in this registry
 * via `listRegisteredPlugins()` instead of the host needing to know each
 * plugin's module path ahead of time.
 */
const registeredPlugins = new Map<string, IPlugin>();

export class PluginRegistrationError extends Error {}

/** Validates the minimum shape a plugin manifest must have, then adds it to the registry. Returns the same plugin (so `export default definePlugin({...})` reads naturally). Throws if a plugin with the same id is already registered -- a silent overwrite would make debugging "which version of X is running" impossible. */
export function definePlugin<TConfig = unknown>(plugin: IPlugin<TConfig>): IPlugin<TConfig> {
  const { id } = plugin.manifest;
  if (!id || id.trim() === "") {
    throw new PluginRegistrationError("Plugin manifest is missing a non-empty id.");
  }
  if (registeredPlugins.has(id)) {
    throw new PluginRegistrationError(`A plugin with id "${id}" is already registered.`);
  }
  registeredPlugins.set(id, plugin as IPlugin);
  return plugin;
}

/** Every plugin registered so far via `definePlugin`, in registration order. */
export function listRegisteredPlugins(): IPlugin[] {
  return Array.from(registeredPlugins.values());
}

export function getRegisteredPlugin(id: string): IPlugin | null {
  return registeredPlugins.get(id) ?? null;
}

/** Test-only escape hatch -- production code never needs to un-register a plugin definition (uninstalling is a Plugin Manager concern, not a registry one). */
export function __clearPluginRegistryForTests(): void {
  registeredPlugins.clear();
}
