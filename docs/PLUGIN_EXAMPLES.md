# Plugin Examples

## 1. Shoe Retirement Celebration (real, working, tested)

`treino-z2/src/platform/examples/shoeRetirementCelebrationPlugin.ts` — a
complete plugin exercising most of the SDK: a manifest with permissions,
`onInstall` seeding config, `onEnable` subscribing to a platform event and
contributing a widget, `onDisable` cleanly unsubscribing. Its test suite
(`platform/tests/examples/shoeRetirementCelebrationPlugin.test.ts`)
installs it against a real (in-memory) `PluginManager`, publishes a
`ShoeRetired` event, and asserts its widget's rendered text changes.

```ts
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
```

Installing it against the app's own Plugin Manager:

```ts
import { appPluginManager } from "platform/manager";
import { createShoeRetirementCelebrationPlugin } from "platform/examples/shoeRetirementCelebrationPlugin";

await appPluginManager.install(createShoeRetirementCelebrationPlugin());
await appPluginManager.enable("com.example.shoe-retirement-celebration");
```

After this, Settings → Plugins lists it, and its widget appears in the
Settings page's plugin widget slot — no Dashboard code was touched.

The remaining examples below are illustrative code (not compiled as part
of this build) showing the shape of a plugin for each of the other 6
extension kinds.

## 2. A dashboard page

```ts
registrar.dashboardPages.contribute({
  id: "my-training-log",
  navLabel: "Training Log",
  route: "plugin-training-log", // must not collide with the core's 8 routes
  render: () => <MyTrainingLogPage />,
});
```

## 3. A custom metric

```ts
registrar.metrics.contribute({
  id: "weekend-warrior-ratio",
  label: "Weekend Warrior Ratio",
  compute: ({ activities }) => {
    const weekend = activities.filter(isWeekendActivity).length;
    return { label: "Weekend Warrior Ratio", value: activities.length > 0 ? weekend / activities.length : null, unit: "%" };
  },
});
```

Note this is explicitly a *presentation-adjacent* metric — it reads the
same `activities` array the Dashboard already fetched, it does not
calculate a physiological quantity (that stays the Metrics Engine's job).

## 4. A plugin-sourced insight

```ts
registrar.insights.contribute({
  id: "negative-split-spotter",
  analyze: ({ activities }) => {
    const negativeSplits = activities.filter(isNegativeSplit);
    if (negativeSplits.length === 0) return [];
    return [
      {
        title: "Negative split streak",
        description: `${negativeSplits.length} of your recent runs were negative splits.`,
        severity: "positive",
        confidence: 0.7,
      },
    ];
  },
});
```

## 5. A plugin-sourced recommendation

```ts
registrar.recommendations.contribute({
  id: "hydration-nudge",
  recommend: ({ activities }) => {
    const hotWeatherSession = activities.some(isHotWeatherSession);
    return hotWeatherSession ? [{ title: "Extra hydration today", description: "Recent sessions suggest hot conditions.", priority: 3 }] : [];
  },
});
```

## 6. A third-party integration

```ts
registrar.integrations.contribute({
  id: "my-wearable-bridge",
  name: "My Wearable",
  async connect() {
    /* requires "network:external" in the manifest */
  },
  async disconnect() {},
  status: () => "connected",
});
```

## 7. An AI command

```ts
registrar.aiCommands.contribute({
  id: "explain-taper",
  command: "explain-taper",
  description: "Explains what a taper is and why the plan includes one.",
  run: async (args) => `A taper reduces training load before a race so you arrive fresh. ${args}`,
});
```

## Testing pattern used by every example above

```ts
const manager = new PluginManager({
  hostVersion: "1.0.0",
  eventBus: new EventBus(),
  configStore: createInMemoryPluginConfigStore(),
});
await manager.install(plugin);
await manager.enable(plugin.manifest.id);
// assert against the extension point(s) the test cares about, or publish
// an event and assert the plugin reacted to it.
await manager.disable(plugin.manifest.id);
// assert every contribution was revoked.
```
