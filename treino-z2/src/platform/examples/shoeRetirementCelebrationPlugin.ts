import { definePlugin } from "../sdk/registry/pluginRegistry";
import type { IPlugin } from "../sdk/contracts/plugin";
import type { Unsubscribe } from "../events/eventBus";

export interface ShoeRetirementCelebrationConfig {
  celebrationMessage: string;
}

const DEFAULT_CONFIG: ShoeRetirementCelebrationConfig = { celebrationMessage: "Great mileage! Time for a new pair." };

/**
 * Reference plugin for PLUGIN_EXAMPLES.md -- exercises most of the SDK
 * surface end to end: a manifest with permissions, `onInstall` seeding
 * config, `onEnable` subscribing to a platform event (`ShoeRetired`) and
 * contributing a widget, `onDisable` cleanly unsubscribing. Kept as a
 * factory (not a module-level singleton) so tests can create isolated
 * instances instead of sharing mutable state across test cases.
 */
export function createShoeRetirementCelebrationPlugin(): IPlugin<ShoeRetirementCelebrationConfig> {
  let lastRetiredShoe: string | null = null;
  let unsubscribe: Unsubscribe | null = null;

  return {
    manifest: {
      id: "com.example.shoe-retirement-celebration",
      name: "Shoe Retirement Celebration",
      version: "1.0.0",
      description: "Shows a congratulatory widget whenever a shoe is retired.",
      author: { name: "Performance OS Team" },
      minHostVersion: "1.0.0",
      maxHostVersion: null,
      dependencies: {},
      extensionPoints: ["widget"],
      permissions: ["contribute:widgets", "storage:plugin-config"],
      signature: null,
    },

    onInstall(context) {
      if (context.config.get() == null) context.config.set(DEFAULT_CONFIG);
    },

    onEnable(context, registrar) {
      unsubscribe = context.events.subscribe("ShoeRetired", (event) => {
        lastRetiredShoe = event.shoeName;
      });

      registrar.widgets.contribute({
        id: "shoe-retirement-celebration-widget",
        title: "Shoe Retirement",
        slot: "settings",
        render: () => {
          const message = context.config.get()?.celebrationMessage ?? DEFAULT_CONFIG.celebrationMessage;
          return lastRetiredShoe ? `${message} (${lastRetiredShoe})` : "No shoe retired yet.";
        },
      });
    },

    onDisable() {
      unsubscribe?.();
      unsubscribe = null;
      lastRetiredShoe = null;
    },
  };
}

/** Calling this once (e.g. at host bootstrap) is the "registro automático" step -- see PLUGIN_DEVELOPER_GUIDE.md. */
export function registerShoeRetirementCelebrationPlugin(): IPlugin<ShoeRetirementCelebrationConfig> {
  return definePlugin(createShoeRetirementCelebrationPlugin());
}
