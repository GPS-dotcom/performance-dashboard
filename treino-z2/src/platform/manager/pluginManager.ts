import type { ExtensionRegistrar } from "../sdk/contracts/registrar";
import type { IPlugin } from "../sdk/contracts/plugin";
import type { PluginManifest } from "../sdk/types/manifest";
import type { PermissionScope } from "../sdk/types/permissions";
import { canTransition } from "../sdk/types/lifecycle";
import type { PluginLifecycleState } from "../sdk/types/lifecycle";
import type { PluginContext } from "../sdk/types/context";
import { EventBus } from "../events/eventBus";
import type { PlatformEventMap } from "../events/types";
import { platformEventBus } from "../events/platformEventBus";
import { liveExtensionRegistrar } from "../extensions/liveExtensionRegistrar";
import { isVersionGte, isVersionInRange } from "../shared/semver";
import { localStoragePluginConfigStore } from "./configStore";
import type { PluginConfigStore } from "./configStore";
import { createPluginContext } from "./pluginContextFactory";
import { createScopedRegistrar } from "./scopedRegistrar";
import type { ScopedRegistrarHandle } from "./scopedRegistrar";
import { extractErrorMessage } from "../../utils/errorMessage";

export class PluginManagerError extends Error {}

export interface InstalledPluginRecord {
  id: string;
  manifest: PluginManifest;
  state: PluginLifecycleState;
  grantedPermissions: PermissionScope[];
  errorMessage: string | null;
}

interface InternalRecord {
  plugin: IPlugin;
  state: PluginLifecycleState;
  grantedPermissions: PermissionScope[];
  errorMessage: string | null;
  context: PluginContext;
  scoped: ScopedRegistrarHandle | null;
}

export interface PluginManagerOptions {
  /** Current Performance OS version -- compared against each plugin's manifest.minHostVersion/maxHostVersion at install time. */
  hostVersion: string;
  eventBus?: EventBus<PlatformEventMap>;
  configStore?: PluginConfigStore;
  extensionRegistrar?: ExtensionRegistrar;
}

function toPublicRecord(id: string, record: InternalRecord): InstalledPluginRecord {
  return { id, manifest: record.plugin.manifest, state: record.state, grantedPermissions: record.grantedPermissions, errorMessage: record.errorMessage };
}

/**
 * FASE 3: install/enable/disable/uninstall, version + dependency
 * checking at install time, per-plugin isolation (a scoped
 * `ExtensionRegistrar` + a scoped `PluginConfigStore` key + a try/catch
 * around every hook), and configuration. This is the one place in the
 * whole platform that mutates plugin state -- extension points, the
 * event bus and the config store are all just collaborators it drives.
 *
 * Install failures are rethrown (a plugin that can't even install is a
 * caller bug worth surfacing loudly). Enable/disable/uninstall hook
 * failures are caught, recorded on the plugin's own record as `"error"`
 * state, and published as a `PluginError` event -- but never rethrown,
 * so one broken plugin can never stop a caller from managing every other
 * plugin (FASE 3's "isolamento").
 */
export class PluginManager {
  private readonly plugins = new Map<string, InternalRecord>();
  private readonly hostVersion: string;
  private readonly eventBus: EventBus<PlatformEventMap>;
  private readonly configStore: PluginConfigStore;
  private readonly extensionRegistrar: ExtensionRegistrar;

  constructor(options: PluginManagerOptions) {
    this.hostVersion = options.hostVersion;
    this.eventBus = options.eventBus ?? platformEventBus;
    this.configStore = options.configStore ?? localStoragePluginConfigStore;
    this.extensionRegistrar = options.extensionRegistrar ?? liveExtensionRegistrar;
  }

  async install(plugin: IPlugin): Promise<void> {
    const { id, version, minHostVersion, maxHostVersion, dependencies, permissions } = plugin.manifest;

    if (this.plugins.has(id)) {
      throw new PluginManagerError(`Plugin "${id}" is already installed.`);
    }
    if (!isVersionInRange(this.hostVersion, minHostVersion, maxHostVersion)) {
      throw new PluginManagerError(`Plugin "${id}" requires host version ${minHostVersion}${maxHostVersion ? `-${maxHostVersion}` : "+"}, but the running host is ${this.hostVersion}.`);
    }
    for (const [depId, minVersion] of Object.entries(dependencies)) {
      const dep = this.plugins.get(depId);
      if (!dep) throw new PluginManagerError(`Plugin "${id}" depends on "${depId}", which is not installed.`);
      if (!isVersionGte(dep.plugin.manifest.version, minVersion)) {
        throw new PluginManagerError(`Plugin "${id}" requires "${depId}" >= ${minVersion}, but ${dep.plugin.manifest.version} is installed.`);
      }
    }

    // MVP grant policy: every requested permission is granted at install
    // time (there is no human-in-the-loop approval UI yet -- see
    // PLUGIN_PLATFORM_REPORT.md's Roadmap). The `grantedPermissions` field
    // exists as its own step specifically so that UI can be added later
    // without changing this method's signature or PluginContext's shape.
    const grantedPermissions: PermissionScope[] = [...permissions];
    const context = createPluginContext(id, grantedPermissions, this.eventBus, this.configStore);
    const record: InternalRecord = { plugin, state: "registered", grantedPermissions, errorMessage: null, context, scoped: null };
    this.plugins.set(id, record);

    try {
      await plugin.onInstall?.(context);
      record.state = "installed";
      this.eventBus.publish("PluginInstalled", { pluginId: id, version });
    } catch (err) {
      const message = extractErrorMessage(err);
      record.state = "error";
      record.errorMessage = message;
      this.eventBus.publish("PluginError", { pluginId: id, message });
      throw err;
    }
  }

  async enable(id: string): Promise<void> {
    const record = this.requireRecord(id);
    if (!canTransition(record.state, "enabled")) {
      throw new PluginManagerError(`Cannot enable plugin "${id}" from state "${record.state}".`);
    }

    const scoped = createScopedRegistrar(this.extensionRegistrar);
    try {
      await record.plugin.onEnable?.(record.context, scoped.registrar);
      record.scoped = scoped;
      record.state = "enabled";
      record.errorMessage = null;
      this.eventBus.publish("PluginEnabled", { pluginId: id });
    } catch (err) {
      scoped.revokeAll(); // undo whatever it managed to contribute before throwing
      const message = extractErrorMessage(err);
      record.state = "error";
      record.errorMessage = message;
      this.eventBus.publish("PluginError", { pluginId: id, message });
    }
  }

  async disable(id: string): Promise<void> {
    const record = this.requireRecord(id);
    if (!canTransition(record.state, "disabled")) {
      throw new PluginManagerError(`Cannot disable plugin "${id}" from state "${record.state}".`);
    }

    try {
      await record.plugin.onDisable?.(record.context);
    } catch (err) {
      const message = extractErrorMessage(err);
      this.eventBus.publish("PluginError", { pluginId: id, message });
    }

    record.scoped?.revokeAll();
    record.scoped = null;
    record.state = "disabled";
    this.eventBus.publish("PluginDisabled", { pluginId: id });
  }

  async uninstall(id: string): Promise<void> {
    const record = this.requireRecord(id);

    const dependents = Array.from(this.plugins.entries()).filter(([otherId, other]) => otherId !== id && id in other.plugin.manifest.dependencies);
    if (dependents.length > 0) {
      throw new PluginManagerError(`Cannot uninstall "${id}": still required by ${dependents.map(([otherId]) => otherId).join(", ")}.`);
    }

    if (record.state === "enabled") {
      await this.disable(id);
    }

    try {
      await record.plugin.onUninstall?.(record.context);
    } catch (err) {
      const message = extractErrorMessage(err);
      this.eventBus.publish("PluginError", { pluginId: id, message });
    }

    this.plugins.delete(id);
    this.configStore.clear(id);
    this.eventBus.publish("PluginUninstalled", { pluginId: id });
  }

  /** Persists new config for `id` and, if it's currently enabled, notifies it via `onConfigChange`. */
  updateConfig<TConfig>(id: string, config: TConfig): void {
    const record = this.requireRecord(id);
    this.configStore.set(id, config);
    if (record.state === "enabled") {
      record.plugin.onConfigChange?.(record.context, config);
    }
  }

  get(id: string): InstalledPluginRecord | null {
    const record = this.plugins.get(id);
    return record ? toPublicRecord(id, record) : null;
  }

  list(): InstalledPluginRecord[] {
    return Array.from(this.plugins.entries()).map(([id, record]) => toPublicRecord(id, record));
  }

  private requireRecord(id: string): InternalRecord {
    const record = this.plugins.get(id);
    if (!record) throw new PluginManagerError(`No plugin installed with id "${id}".`);
    return record;
  }
}
