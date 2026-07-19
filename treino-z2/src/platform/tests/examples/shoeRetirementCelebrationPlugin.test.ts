import { afterEach, describe, expect, it } from "vitest";
import { createShoeRetirementCelebrationPlugin, registerShoeRetirementCelebrationPlugin } from "../../examples/shoeRetirementCelebrationPlugin";
import { __clearPluginRegistryForTests, listRegisteredPlugins } from "../../sdk/registry/pluginRegistry";
import { PluginManager } from "../../manager/pluginManager";
import { EventBus } from "../../events/eventBus";
import type { PlatformEventMap } from "../../events/types";
import { createInMemoryPluginConfigStore } from "../../manager/configStore";
import { createExtensionPoint } from "../../extensions/extensionPointBase";
import type { ExtensionRegistrar } from "../../sdk/contracts/registrar";
import type { IWidgetExtension } from "../../sdk/contracts/extensions";

function makeManager() {
  const eventBus = new EventBus<PlatformEventMap>();
  const configStore = createInMemoryPluginConfigStore();
  const widgets = createExtensionPoint<IWidgetExtension>("widget");
  const extensionRegistrar = {
    dashboardPages: createExtensionPoint("dashboard-page"),
    widgets,
    metrics: createExtensionPoint("metric"),
    insights: createExtensionPoint("insight"),
    recommendations: createExtensionPoint("recommendation"),
    integrations: createExtensionPoint("integration"),
    aiCommands: createExtensionPoint("ai-command"),
  } as unknown as ExtensionRegistrar;
  const manager = new PluginManager({ hostVersion: "1.0.0", eventBus, configStore, extensionRegistrar });
  return { manager, eventBus, configStore, widgets };
}

afterEach(() => {
  __clearPluginRegistryForTests();
});

describe("createShoeRetirementCelebrationPlugin", () => {
  it("has a valid manifest requesting exactly the permissions it uses", () => {
    const plugin = createShoeRetirementCelebrationPlugin();
    expect(plugin.manifest.id).toBe("com.example.shoe-retirement-celebration");
    expect(plugin.manifest.permissions).toEqual(["contribute:widgets", "storage:plugin-config"]);
  });

  it("seeds default config on install", async () => {
    const { manager, configStore } = makeManager();
    await manager.install(createShoeRetirementCelebrationPlugin());
    expect(configStore.get("com.example.shoe-retirement-celebration")).toEqual({ celebrationMessage: "Great mileage! Time for a new pair." });
  });

  it("does not overwrite existing config on a second install-less config check (config already seeded)", async () => {
    const { manager, configStore } = makeManager();
    configStore.set("com.example.shoe-retirement-celebration", { celebrationMessage: "Custom!" });
    await manager.install(createShoeRetirementCelebrationPlugin());
    expect(configStore.get("com.example.shoe-retirement-celebration")).toEqual({ celebrationMessage: "Custom!" });
  });

  it("contributes a settings widget on enable, showing 'no shoe retired yet' before any event", async () => {
    const { manager, widgets } = makeManager();
    await manager.install(createShoeRetirementCelebrationPlugin());
    await manager.enable("com.example.shoe-retirement-celebration");

    const widget = widgets.get("shoe-retirement-celebration-widget");
    expect(widget?.slot).toBe("settings");
    expect(widget?.render()).toBe("No shoe retired yet.");
  });

  it("updates its widget's text after a ShoeRetired event", async () => {
    const { manager, eventBus, widgets } = makeManager();
    await manager.install(createShoeRetirementCelebrationPlugin());
    await manager.enable("com.example.shoe-retirement-celebration");

    eventBus.publish("ShoeRetired", { athleteId: null, shoeName: "Pegasus 40", totalDistanceKm: 650, retiredAt: "2026-07-19" });

    const widget = widgets.get("shoe-retirement-celebration-widget");
    expect(widget?.render()).toContain("Pegasus 40");
  });

  it("stops reacting to ShoeRetired and forgets state after being disabled", async () => {
    const { manager, eventBus, widgets } = makeManager();
    await manager.install(createShoeRetirementCelebrationPlugin());
    await manager.enable("com.example.shoe-retirement-celebration");
    eventBus.publish("ShoeRetired", { athleteId: null, shoeName: "Pegasus 40", totalDistanceKm: 650, retiredAt: "2026-07-19" });

    await manager.disable("com.example.shoe-retirement-celebration");

    expect(widgets.get("shoe-retirement-celebration-widget")).toBeNull();

    // Re-enabling starts fresh -- the event that happened while disabled is not remembered.
    await manager.enable("com.example.shoe-retirement-celebration");
    expect(widgets.get("shoe-retirement-celebration-widget")?.render()).toBe("No shoe retired yet.");
  });
});

describe("registerShoeRetirementCelebrationPlugin", () => {
  it("registers the plugin into the SDK's automatic registry", () => {
    registerShoeRetirementCelebrationPlugin();
    expect(listRegisteredPlugins().map((p) => p.manifest.id)).toContain("com.example.shoe-retirement-celebration");
  });
});
