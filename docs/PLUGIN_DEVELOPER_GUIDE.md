# Plugin Developer Guide

A step-by-step walkthrough for building a Performance OS plugin, from an
empty file to something installed and rendering in the Dashboard. See
`PLUGIN_SDK.md` for the type reference and `PLUGIN_API.md` for the full
API; this doc is the "how do I actually do this" companion.

## 1. Decide what you're building

Pick one (or more) of the 7 extension kinds: dashboard page, widget,
metric, insight, recommendation, integration, AI command. Most plugins
start with a widget — it's the smallest useful surface.

## 2. Write the manifest

```ts
const manifest: PluginManifest = {
  id: "com.example.my-plugin",       // reverse-domain, globally unique
  name: "My Plugin",
  version: "1.0.0",
  description: "What it does, in one sentence.",
  author: { name: "Your Name" },
  minHostVersion: "1.0.0",            // platform/shared/hostVersion.ts's HOST_VERSION today
  maxHostVersion: null,               // or an upper bound once you've tested against it
  dependencies: {},                    // other plugin ids -> minimum version, if any
  extensionPoints: ["widget"],
  permissions: ["contribute:widgets"], // only what you actually use -- see PLUGIN_API.md's PERMISSION_CATALOG
  signature: null,                     // null for local/dev plugins
};
```

Ask for the fewest permissions that let your plugin work. `validatePluginManifest`
(from `platform/marketplace`) will catch a malformed manifest before you
even try to install it.

## 3. Implement `IPlugin`

```ts
import { definePlugin } from "platform/sdk";
import type { IPlugin } from "platform/sdk";

export function createMyPlugin(): IPlugin {
  return {
    manifest,
    onInstall(context) {
      // Seed default config, if any. Runs once, at install time.
    },
    onEnable(context, registrar) {
      // The only place you can call registrar.<port>.contribute(...).
      registrar.widgets.contribute({
        id: "my-widget",
        title: "My Widget",
        slot: "settings",           // "home" | "settings" | "coach"
        render: () => "Hello from my plugin!",
      });
    },
    onDisable(context) {
      // Clean up subscriptions/timers you started in onEnable.
      // You do NOT need to call registrar.widgets.revoke() yourself --
      // the Plugin Manager revokes every contribution you made
      // automatically when you're disabled.
    },
    onUninstall(context) {
      // Final cleanup, e.g. clearing anything you wrote outside config (rare).
    },
  };
}

export default definePlugin(createMyPlugin());
```

Every hook is optional — implement only what you need.

## 4. Use the `PluginContext`

Every hook receives a `PluginContext` scoped to your plugin:

```ts
onEnable(context, registrar) {
  // Permissions
  if (!context.hasPermission("contribute:widgets")) return;

  // Config (persisted automatically -- see platform/manager/configStore.ts)
  const saved = context.config.get<{ threshold: number }>();
  context.config.set({ threshold: saved?.threshold ?? 10 });

  // Events -- subscribe to anything in PlatformEventMap
  const unsubscribe = context.events.subscribe("ShoeRetired", (event) => {
    context.logger.info(`${event.shoeName} retired after ${event.totalDistanceKm}km`);
  });

  // Logging
  context.logger.info("enabled");
}
```

## 5. Install and enable it

A host (or, today, a test / a bootstrap script) drives the
`PluginManager`:

```ts
import { appPluginManager } from "platform/manager";
import myPlugin from "./myPlugin";

await appPluginManager.install(myPlugin);
await appPluginManager.enable(myPlugin.manifest.id);
```

The Dashboard's Settings page (`dashboard/pages/SettingsPage.tsx`) lists
whatever `appPluginManager.list()` returns and renders whatever
`widgetExtensionPoint.list()` returns for the `"settings"` slot — nothing
plugin-specific needs to change there. That's the whole point: your
plugin becomes visible without a single core file being edited to know
about it by name.

## 6. Write tests

Construct a fresh `PluginManager` per test (never share `appPluginManager`
across tests) with an in-memory config store and a fresh `EventBus`:

```ts
import { PluginManager } from "platform/manager";
import { EventBus } from "platform/events";
import { createInMemoryPluginConfigStore } from "platform/manager";

const manager = new PluginManager({
  hostVersion: "1.0.0",
  eventBus: new EventBus(),
  configStore: createInMemoryPluginConfigStore(),
});

await manager.install(createMyPlugin());
await manager.enable("com.example.my-plugin");
```

See `platform/tests/examples/shoeRetirementCelebrationPlugin.test.ts` for
a complete example exercising install → enable → event → disable.

## Rules of thumb

- **Never fabricate Engine data.** An `IInsightExtension`/`IRecommendationExtension`
  gets already-fetched `activities`/`metricsHistory` as plain arguments —
  it never calls into `metrics/`, `intelligence/`, `prediction/` or
  `coach/` directly, and it never claims to be an official Engine output
  (your contributions render in their own "plugin-sourced" stream, not
  mixed into the core Engines' own output).
- **Clean up in `onDisable`.** Unsubscribe from events you subscribed to
  in `onEnable`. Contributed extensions are revoked for you automatically,
  but timers/subscriptions are not.
- **Request the minimum permissions.** A widget-only plugin needs
  `contribute:widgets`, not `network:external`.
- **Version your manifest.** Bump `version` on every published change so
  `dependencies` from other plugins resolve correctly.
- **Don't reach for `window`/`document` unless you have to.** Widgets
  return `ReactNode` — you're composing into the host's render tree, not
  replacing it.

## Common mistakes

| Mistake | What happens |
|---|---|
| Reusing an `id` another installed plugin (or one of your own past widgets) already uses | `DuplicateExtensionError` / `PluginManagerError` at install/enable time |
| Calling `registrar.widgets.contribute` outside `onEnable` | Doesn't compile — `ExtensionRegistrar` is only a parameter of `onEnable` |
| Forgetting `dependencies` for a plugin that assumes another is installed | `install()` throws `"depends on X, which is not installed"` |
| Declaring `permissions: []` but calling `context.events.publish` for a "contribute:*" scoped action | Nothing stops the publish itself (the Event Bus doesn't gate by permission), but a reviewer/marketplace would flag the manifest as understating what the plugin does — declare what you actually use |
