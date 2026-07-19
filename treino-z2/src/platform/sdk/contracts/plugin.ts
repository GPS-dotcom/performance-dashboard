import type { PluginContext } from "../types/context";
import type { PluginManifest } from "../types/manifest";
import type { ExtensionRegistrar } from "./registrar";

/**
 * The one contract every plugin implements. All 4 lifecycle hooks are
 * optional -- a plugin that only wants to contribute a static widget
 * needs nothing but `onEnable`. Every hook is handed a `PluginContext`
 * scoped to exactly this plugin (never another plugin's), and `onEnable`
 * additionally receives the `ExtensionRegistrar` -- the only place a
 * plugin can call `.contribute(...)`, since contributions must not
 * outlive the enabled state (the Plugin Manager calls `.revoke(...)` for
 * everything a plugin contributed when it's disabled -- see
 * manager/pluginManager.ts).
 */
export interface IPlugin<TConfig = unknown> {
  manifest: PluginManifest;
  onInstall?(context: PluginContext<TConfig>): void | Promise<void>;
  onEnable?(context: PluginContext<TConfig>, registrar: ExtensionRegistrar): void | Promise<void>;
  onDisable?(context: PluginContext<TConfig>): void | Promise<void>;
  onUninstall?(context: PluginContext<TConfig>): void | Promise<void>;
  onConfigChange?(context: PluginContext<TConfig>, newConfig: TConfig): void;
}
