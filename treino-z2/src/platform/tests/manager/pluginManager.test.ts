import { afterEach, describe, expect, it, vi } from "vitest";
import { PluginManager, PluginManagerError } from "../../manager/pluginManager";
import { createInMemoryPluginConfigStore } from "../../manager/configStore";
import { EventBus } from "../../events/eventBus";
import type { PlatformEventMap } from "../../events/types";
import { createExtensionPoint } from "../../extensions/extensionPointBase";
import type { ExtensionRegistrar } from "../../sdk/contracts/registrar";
import type { IPlugin } from "../../sdk/contracts/plugin";
import type { PluginManifest } from "../../sdk/types/manifest";
import type { IWidgetExtension } from "../../sdk/contracts/extensions";

function widget(id: string): IWidgetExtension {
  return { id, title: id, slot: "home", render: () => id };
}

function makeFakeRegistrar() {
  const widgets = createExtensionPoint<IWidgetExtension>("widget");
  const registrar: ExtensionRegistrar = {
    dashboardPages: createExtensionPoint("dashboard-page"),
    widgets,
    metrics: createExtensionPoint("metric"),
    insights: createExtensionPoint("insight"),
    recommendations: createExtensionPoint("recommendation"),
    integrations: createExtensionPoint("integration"),
    aiCommands: createExtensionPoint("ai-command"),
  };
  return { registrar, widgets };
}

function makeManager(extensionRegistrar?: ExtensionRegistrar) {
  const eventBus = new EventBus<PlatformEventMap>();
  const configStore = createInMemoryPluginConfigStore();
  const { registrar } = makeFakeRegistrar();
  const manager = new PluginManager({ hostVersion: "1.0.0", eventBus, configStore, extensionRegistrar: extensionRegistrar ?? registrar });
  return { manager, eventBus, configStore };
}

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "com.example.test",
    name: "Test Plugin",
    version: "1.0.0",
    description: "A plugin for tests.",
    author: { name: "Test" },
    minHostVersion: "1.0.0",
    maxHostVersion: null,
    dependencies: {},
    extensionPoints: [],
    permissions: [],
    signature: null,
    ...overrides,
  };
}

function makePlugin(overrides: Partial<IPlugin> = {}, manifestOverrides: Partial<PluginManifest> = {}): IPlugin {
  return { manifest: makeManifest(manifestOverrides), ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PluginManager.install", () => {
  it("installs a plugin with no hooks and publishes PluginInstalled", async () => {
    const { manager, eventBus } = makeManager();
    const handler = vi.fn();
    eventBus.subscribe("PluginInstalled", handler);

    await manager.install(makePlugin());

    expect(manager.get("com.example.test")?.state).toBe("installed");
    expect(handler).toHaveBeenCalledWith({ pluginId: "com.example.test", version: "1.0.0" });
  });

  it("throws when the same id is installed twice", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin());
    await expect(manager.install(makePlugin())).rejects.toThrow(PluginManagerError);
  });

  it("throws when the plugin requires a newer host version than is running", async () => {
    const { manager } = makeManager();
    await expect(manager.install(makePlugin({}, { minHostVersion: "2.0.0" }))).rejects.toThrow(PluginManagerError);
  });

  it("throws when the plugin's maxHostVersion is below the running host version", async () => {
    const { manager } = makeManager();
    await expect(manager.install(makePlugin({}, { minHostVersion: "0.1.0", maxHostVersion: "0.9.0" }))).rejects.toThrow(PluginManagerError);
  });

  it("throws when a required dependency is not installed", async () => {
    const { manager } = makeManager();
    await expect(manager.install(makePlugin({}, { dependencies: { "com.example.base": "1.0.0" } }))).rejects.toThrow(PluginManagerError);
  });

  it("throws when an installed dependency's version is too low", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({}, { id: "com.example.base", version: "1.0.0" }));
    await expect(manager.install(makePlugin({}, { id: "com.example.dependent", dependencies: { "com.example.base": "2.0.0" } }))).rejects.toThrow(PluginManagerError);
  });

  it("succeeds when a dependency is installed at a sufficient version", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({}, { id: "com.example.base", version: "1.5.0" }));
    await manager.install(makePlugin({}, { id: "com.example.dependent", dependencies: { "com.example.base": "1.0.0" } }));
    expect(manager.get("com.example.dependent")?.state).toBe("installed");
  });

  it("calls onInstall with a scoped PluginContext", async () => {
    const onInstall = vi.fn();
    const { manager } = makeManager();
    await manager.install(makePlugin({ onInstall }, { permissions: ["read:activities"] }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    const context = onInstall.mock.calls[0][0];
    expect(context.pluginId).toBe("com.example.test");
    expect(context.hasPermission("read:activities")).toBe(true);
  });

  it("grants exactly the permissions requested in the manifest", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({}, { permissions: ["read:activities", "contribute:widgets"] }));
    expect(manager.get("com.example.test")?.grantedPermissions).toEqual(["read:activities", "contribute:widgets"]);
  });

  it("when onInstall throws, records state 'error', publishes PluginError, and rethrows", async () => {
    const { manager, eventBus } = makeManager();
    const errorHandler = vi.fn();
    eventBus.subscribe("PluginError", errorHandler);

    await expect(manager.install(makePlugin({ onInstall: () => Promise.reject(new Error("install failed")) }))).rejects.toThrow("install failed");

    expect(manager.get("com.example.test")?.state).toBe("error");
    expect(manager.get("com.example.test")?.errorMessage).toBe("install failed");
    expect(errorHandler).toHaveBeenCalledWith({ pluginId: "com.example.test", message: "install failed" });
  });

  it("wraps a non-Error throw from onInstall into a string message", async () => {
    const { manager } = makeManager();
    await expect(manager.install(makePlugin({ onInstall: () => Promise.reject("plain string") }))).rejects.toBe("plain string");
    expect(manager.get("com.example.test")?.errorMessage).toBe("plain string");
  });
});

describe("PluginManager.enable", () => {
  it("throws when the plugin id is unknown", async () => {
    const { manager } = makeManager();
    await expect(manager.enable("missing")).rejects.toThrow(PluginManagerError);
  });

  it("enables an installed plugin, calls onEnable with a registrar, and publishes PluginEnabled", async () => {
    const onEnable = vi.fn();
    const { manager, eventBus } = makeManager();
    const handler = vi.fn();
    eventBus.subscribe("PluginEnabled", handler);
    await manager.install(makePlugin({ onEnable }));

    await manager.enable("com.example.test");

    expect(manager.get("com.example.test")?.state).toBe("enabled");
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onEnable.mock.calls[0][1].widgets).toBeDefined();
    expect(handler).toHaveBeenCalledWith({ pluginId: "com.example.test" });
  });

  it("a widget contributed during onEnable is visible on the live extension point", async () => {
    const { registrar, widgets } = makeFakeRegistrar();
    const { manager } = makeManager(registrar);
    await manager.install(makePlugin({ onEnable: (_ctx, r) => r.widgets.contribute(widget("my-widget")) }));

    await manager.enable("com.example.test");

    expect(widgets.get("my-widget")).not.toBeNull();
    expect(widgets.get("my-widget")?.id).toBe("my-widget");
  });

  it("throws when the plugin is in a state that cannot transition to enabled", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({ onInstall: () => Promise.reject(new Error("boom")) })).catch(() => {});
    expect(manager.get("com.example.test")?.state).toBe("error");
    await expect(manager.enable("com.example.test")).rejects.toThrow(PluginManagerError);
  });

  it("when onEnable throws, revokes partial contributions, records 'error', publishes PluginError, and does not rethrow", async () => {
    const { registrar, widgets } = makeFakeRegistrar();
    const { manager, eventBus } = makeManager(registrar);
    const errorHandler = vi.fn();
    eventBus.subscribe("PluginError", errorHandler);
    await manager.install(
      makePlugin({
        onEnable: (_ctx, r) => {
          r.widgets.contribute(widget("partial-widget"));
          throw new Error("enable failed");
        },
      }),
    );

    await expect(manager.enable("com.example.test")).resolves.toBeUndefined();

    expect(widgets.get("partial-widget")).toBeNull();
    expect(manager.get("com.example.test")?.state).toBe("error");
    expect(manager.get("com.example.test")?.errorMessage).toBe("enable failed");
    expect(errorHandler).toHaveBeenCalledWith({ pluginId: "com.example.test", message: "enable failed" });
  });
});

describe("PluginManager.disable", () => {
  it("throws when the plugin id is unknown", async () => {
    const { manager } = makeManager();
    await expect(manager.disable("missing")).rejects.toThrow(PluginManagerError);
  });

  it("throws when the plugin is not currently enabled", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin());
    await expect(manager.disable("com.example.test")).rejects.toThrow(PluginManagerError);
  });

  it("disables an enabled plugin, calls onDisable, revokes contributions, and publishes PluginDisabled", async () => {
    const onDisable = vi.fn();
    const { registrar, widgets } = makeFakeRegistrar();
    const { manager, eventBus } = makeManager(registrar);
    const handler = vi.fn();
    eventBus.subscribe("PluginDisabled", handler);
    await manager.install(makePlugin({ onEnable: (_ctx, r) => r.widgets.contribute(widget("w1")), onDisable }));
    await manager.enable("com.example.test");

    await manager.disable("com.example.test");

    expect(onDisable).toHaveBeenCalledTimes(1);
    expect(widgets.get("w1")).toBeNull();
    expect(manager.get("com.example.test")?.state).toBe("disabled");
    expect(handler).toHaveBeenCalledWith({ pluginId: "com.example.test" });
  });

  it("still revokes contributions and transitions to disabled even when onDisable throws", async () => {
    const { registrar, widgets } = makeFakeRegistrar();
    const { manager, eventBus } = makeManager(registrar);
    const errorHandler = vi.fn();
    eventBus.subscribe("PluginError", errorHandler);
    await manager.install(makePlugin({ onEnable: (_ctx, r) => r.widgets.contribute(widget("w1")), onDisable: () => Promise.reject(new Error("disable failed")) }));
    await manager.enable("com.example.test");

    await manager.disable("com.example.test");

    expect(widgets.get("w1")).toBeNull();
    expect(manager.get("com.example.test")?.state).toBe("disabled");
    expect(errorHandler).toHaveBeenCalledWith({ pluginId: "com.example.test", message: "disable failed" });
  });

  it("a disabled plugin can be re-enabled", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin());
    await manager.enable("com.example.test");
    await manager.disable("com.example.test");
    await manager.enable("com.example.test");
    expect(manager.get("com.example.test")?.state).toBe("enabled");
  });
});

describe("PluginManager.uninstall", () => {
  it("throws when the plugin id is unknown", async () => {
    const { manager } = makeManager();
    await expect(manager.uninstall("missing")).rejects.toThrow(PluginManagerError);
  });

  it("throws when another installed plugin still depends on it", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({}, { id: "com.example.base" }));
    await manager.install(makePlugin({}, { id: "com.example.dependent", dependencies: { "com.example.base": "1.0.0" } }));
    await expect(manager.uninstall("com.example.base")).rejects.toThrow(PluginManagerError);
  });

  it("uninstalls a merely-installed (never enabled) plugin directly", async () => {
    const onUninstall = vi.fn();
    const { manager, eventBus } = makeManager();
    const handler = vi.fn();
    eventBus.subscribe("PluginUninstalled", handler);
    await manager.install(makePlugin({ onUninstall }));

    await manager.uninstall("com.example.test");

    expect(onUninstall).toHaveBeenCalledTimes(1);
    expect(manager.get("com.example.test")).toBeNull();
    expect(handler).toHaveBeenCalledWith({ pluginId: "com.example.test" });
  });

  it("disables an enabled plugin first, then uninstalls it", async () => {
    const onDisable = vi.fn();
    const onUninstall = vi.fn();
    const { manager } = makeManager();
    await manager.install(makePlugin({ onDisable, onUninstall }));
    await manager.enable("com.example.test");

    await manager.uninstall("com.example.test");

    expect(onDisable).toHaveBeenCalledTimes(1);
    expect(onUninstall).toHaveBeenCalledTimes(1);
    expect(manager.get("com.example.test")).toBeNull();
  });

  it("still removes the plugin and publishes PluginUninstalled even when onUninstall throws", async () => {
    const { manager, eventBus } = makeManager();
    const errorHandler = vi.fn();
    const uninstalledHandler = vi.fn();
    eventBus.subscribe("PluginError", errorHandler);
    eventBus.subscribe("PluginUninstalled", uninstalledHandler);
    await manager.install(makePlugin({ onUninstall: () => Promise.reject(new Error("uninstall failed")) }));

    await manager.uninstall("com.example.test");

    expect(manager.get("com.example.test")).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith({ pluginId: "com.example.test", message: "uninstall failed" });
    expect(uninstalledHandler).toHaveBeenCalledWith({ pluginId: "com.example.test" });
  });

  it("clears the plugin's persisted config", async () => {
    const { manager, configStore } = makeManager();
    await manager.install(makePlugin());
    manager.updateConfig("com.example.test", { value: 1 });
    expect(configStore.get("com.example.test")).toEqual({ value: 1 });

    await manager.uninstall("com.example.test");

    expect(configStore.get("com.example.test")).toBeNull();
  });
});

describe("PluginManager.updateConfig", () => {
  it("throws when the plugin id is unknown", () => {
    const { manager } = makeManager();
    expect(() => manager.updateConfig("missing", { value: 1 })).toThrow(PluginManagerError);
  });

  it("persists config via the config store", async () => {
    const { manager, configStore } = makeManager();
    await manager.install(makePlugin());
    manager.updateConfig("com.example.test", { value: 42 });
    expect(configStore.get("com.example.test")).toEqual({ value: 42 });
  });

  it("calls onConfigChange when the plugin is enabled", async () => {
    const onConfigChange = vi.fn();
    const { manager } = makeManager();
    await manager.install(makePlugin({ onConfigChange }));
    await manager.enable("com.example.test");

    manager.updateConfig("com.example.test", { value: 1 });

    expect(onConfigChange).toHaveBeenCalledTimes(1);
    expect(onConfigChange.mock.calls[0][1]).toEqual({ value: 1 });
  });

  it("does not call onConfigChange when the plugin is not enabled", async () => {
    const onConfigChange = vi.fn();
    const { manager } = makeManager();
    await manager.install(makePlugin({ onConfigChange }));

    manager.updateConfig("com.example.test", { value: 1 });

    expect(onConfigChange).not.toHaveBeenCalled();
  });
});

describe("PluginManager.get / list", () => {
  it("get() returns null for an unknown id", () => {
    const { manager } = makeManager();
    expect(manager.get("missing")).toBeNull();
  });

  it("list() returns every installed plugin", async () => {
    const { manager } = makeManager();
    await manager.install(makePlugin({}, { id: "com.example.a" }));
    await manager.install(makePlugin({}, { id: "com.example.b" }));
    expect(manager.list().map((p) => p.id).sort()).toEqual(["com.example.a", "com.example.b"]);
  });

  it("list() is empty for a fresh manager", () => {
    const { manager } = makeManager();
    expect(manager.list()).toEqual([]);
  });
});
