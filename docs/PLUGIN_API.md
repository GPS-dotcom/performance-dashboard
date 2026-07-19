# Plugin API Reference

Full reference for everything under `treino-z2/src/platform/` beyond the
SDK itself (see `PLUGIN_SDK.md` for `sdk/`). This is host-side API — a
plugin author only touches the pieces documented here indirectly, through
the `PluginContext` and `ExtensionRegistrar` the Plugin Manager hands
them.

## Event Bus (`platform/events/`)

### `EventBus<TEventMap>`

A typed, synchronous, in-process publish/subscribe bus.

```ts
class EventBus<TEventMap extends object> {
  publish<K extends keyof TEventMap>(type: K, payload: TEventMap[K]): void;
  subscribe<K extends keyof TEventMap>(type: K, handler: (payload: TEventMap[K]) => void): Unsubscribe;
  once<K extends keyof TEventMap>(type: K, handler: (payload: TEventMap[K]) => void): Unsubscribe;
  clear<K extends keyof TEventMap>(type?: K): void;
  listenerCount<K extends keyof TEventMap>(type: K): number;
}
```

A handler that throws is caught and logged — it never stops the other
subscribers of the same event from running.

### `platformEventBus`

The one shared `EventBus<PlatformEventMap>` instance the whole app uses.
`PluginContext.events` is a narrow, subscribe/publish-only view onto it
(a plugin can never call `.clear()` on it).

### `PlatformEventMap` (`platform/events/types.ts`)

| Event | Payload | Fired when |
|---|---|---|
| `ActivityImported` | `{ activityId, athleteId, startDate, distanceM }` | An activity is imported |
| `MetricsCalculated` | `{ athleteId, date, ctl, atl, tsb }` | The Metrics Engine produces a new snapshot |
| `PredictionGenerated` | `{ athleteId, predictionId, predictionType, confidence }` | The Prediction Engine produces a forecast |
| `RecommendationCreated` | `{ athleteId, recommendationId, recommendationType, priority }` | The Coach Engine produces a recommendation |
| `RaceCompleted` | `{ athleteId, activityId, distanceKm, timeSec }` | A race-type activity is recorded |
| `ShoeRetired` | `{ athleteId, shoeName, totalDistanceKm, retiredAt }` | A shoe is retired |
| `PluginInstalled` / `PluginEnabled` / `PluginDisabled` / `PluginUninstalled` | `{ pluginId, ... }` | Plugin Manager lifecycle transitions |
| `PluginError` | `{ pluginId, message }` | Any plugin lifecycle hook throws |

Adding a new event type means adding one line to `PlatformEventMap` —
nothing else changes.

## Plugin Manager (`platform/manager/`)

### `PluginManager`

```ts
new PluginManager({ hostVersion, eventBus?, configStore?, extensionRegistrar? })
```

| Method | Behavior |
|---|---|
| `install(plugin: IPlugin): Promise<void>` | Validates host-version compatibility and every declared dependency, grants the requested permissions, calls `onInstall`. **Rethrows** on failure — a plugin that can't even install is a caller bug worth surfacing. |
| `enable(id): Promise<void>` | Calls `onEnable(context, registrar)` with a *scoped* registrar that tracks every contribution. On success: state → `enabled`, `PluginEnabled` published. On failure: contributions are rolled back, state → `error`, `PluginError` published — **never rethrows** (isolation). |
| `disable(id): Promise<void>` | Calls `onDisable`, then revokes every contribution this plugin made, regardless of whether `onDisable` threw. State → `disabled`. |
| `uninstall(id): Promise<void>` | Refuses if another installed plugin still depends on this one. Auto-disables first if enabled, calls `onUninstall`, clears its config, removes it from the manager. |
| `updateConfig(id, config)` | Persists via the config store; calls `onConfigChange` only if the plugin is currently enabled. |
| `get(id)` / `list()` | Read-only snapshots (`InstalledPluginRecord`: id, manifest, state, grantedPermissions, errorMessage). |

Install failures are loud (rethrown); enable/disable/uninstall hook
failures are isolated (caught, recorded, published as `PluginError`,
never propagated) — one broken plugin can never stop a caller from
managing every other plugin.

### `appPluginManager`

The one `PluginManager` instance the running app shares (host version =
`platform/shared/hostVersion.ts`'s `HOST_VERSION`). The Dashboard's
Settings page reads from this.

### `resolveDependencyOrder(plugins)` (`dependencyResolver.ts`)

Pure function: given a batch of `{ id, version, dependencies }`, returns
a topologically-sorted install order plus a list of `missing` /
`version-mismatch` / `circular` errors. Used when installing several
plugins together (a future batch-install / marketplace flow); `install()`
itself only checks against what's *already* installed.

### `PluginConfigStore` (`configStore.ts`)

```ts
interface PluginConfigStore {
  get<T>(pluginId): T | null;
  set<T>(pluginId, value: T): void;
  clear(pluginId): void;
}
```

`localStoragePluginConfigStore` is the default (namespaced
`localStorage`, defensive try/catch). `createInMemoryPluginConfigStore()`
is what tests use, and a reasonable default for a non-browser host.

## Extension Points (`platform/extensions/`)

Seven id-keyed registries, one per `ExtensionPointKind`:
`dashboardPageExtensionPoint`, `widgetExtensionPoint`,
`metricExtensionPoint`, `insightExtensionPoint`,
`recommendationExtensionPoint`, `integrationExtensionPoint`,
`aiCommandExtensionPoint`. Each exposes:

```ts
interface ExtensionPointRegistry<T> {
  contribute(extension: T): void;  // throws DuplicateExtensionError on a repeated id
  revoke(extensionId: string): void;
  list(): T[];
  get(extensionId: string): T | null;
}
```

`liveExtensionRegistrar` bundles all 7 into the `ExtensionRegistrar`
shape a plugin's `onEnable` receives. A plugin only ever sees
`contribute`/`revoke` (never `list`/`get` — no legitimate reason for a
plugin to enumerate another plugin's contributions); the host reads
`list()` directly, e.g. `dashboard/widgets/PluginWidgetSlot.tsx` calling
`widgetExtensionPoint.list()`.

### The 7 extension contracts (`sdk/contracts/extensions.ts`)

| Contract | Contributes | Notes |
|---|---|---|
| `IDashboardPageExtension` | A new nav page (`id`, `navLabel`, `route`, `render()`) | Route must not collide with the core's 8 pages |
| `IWidgetExtension` | A widget into a named slot (`"home" \| "settings" \| "coach"`) | Rendered generically by `PluginWidgetSlot` |
| `IMetricExtension` | A presentation-adjacent custom metric | Explicitly not a physiological ground-truth metric — only the Metrics Engine produces those |
| `IInsightExtension` | Plugin-sourced insights | Kept in their own stream, never merged into the Intelligence Engine's `Insight[]` |
| `IRecommendationExtension` | Plugin-sourced recommendations | Kept in their own stream, never merged into the Coach Engine's `Recommendation[]` |
| `IIntegrationExtension` | A third-party data source bridge | Requires `network:external` |
| `IAiCommandExtension` | A command the future AI Assistant can invoke | String-in/string-out; no compile-time coupling to the not-yet-built Assistant module |

## Marketplace prep (`platform/marketplace/`)

### `validatePluginManifest(manifest): { valid, errors }`

Checks id format (reverse-domain), semver validity of every version
field, non-empty required fields, and that every declared permission
scope is a known one. Run *before* `install()` on any manifest that
arrived as untyped data (e.g. from a marketplace API) — an in-repo plugin
already gets this for free from TypeScript.

### `checkHostCompatibility(manifest, hostVersion): { compatible, reason }`

The same host-version range check `install()` runs, exposed standalone
for a marketplace listing to show compatibility *before* an athlete
attempts to install.

### `verifyPluginSignature(manifest, verifier?): { verified, reason }`

Unsigned manifests (`signature: null`) pass — there's no marketplace to
sign against yet. A signed manifest is checked against a pluggable
`SignatureVerifier`; the default (`trustUnsignedVerifier`) always reports
`verified: false` for anything it's asked to check, since no real
cryptographic verifier ships with this SDK.

### `PERMISSION_CATALOG` / `describePermission(scope)`

Human-readable label, description and risk tier (`low`/`medium`/`high`)
for every `PermissionScope` — what a future "this plugin wants to: ..."
install screen renders from.

## Dashboard touchpoints (the only 2 files in core that import `platform/`)

- `dashboard/widgets/PluginWidgetSlot.tsx` — renders `widgetExtensionPoint.list()`
  filtered by slot, generically.
- `dashboard/pages/SettingsPage.tsx` — lists `appPluginManager.list()` and
  mounts `<PluginWidgetSlot slot="settings" />`.

Both import only SDK-level abstractions, never a specific plugin. See
`PLUGIN_PLATFORM_REPORT.md`'s Architecture section for the full
dependency diagram.
