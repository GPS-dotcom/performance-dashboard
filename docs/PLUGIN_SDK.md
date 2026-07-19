# Plugin SDK

The Plugin SDK is the public contract layer for extending Performance OS
without touching its core (`src/{metrics,intelligence,prediction,coach,dashboard}`).
It lives at `treino-z2/src/platform/sdk/` and is the *only* thing a plugin
author needs to import to write a plugin — no Engine, no Supabase client,
no React internals.

> Governance note, consistent with every other doc in this repo: `docs/`
> only physically contains `ARCHITECTURE.md` plus this file and its three
> siblings (`PLUGIN_API.md`, `PLUGIN_DEVELOPER_GUIDE.md`,
> `PLUGIN_EXAMPLES.md`) — all four were written as part of this Plugin
> Platform build. There is no separate "Performance.MD" plugin spec being
> summarized here; this is the primary source.

## Why a Plugin SDK

The core follows Dependency Inversion: high-level modules (the Dashboard,
the Coach Engine) never depend on low-level modules (a specific plugin).
Both depend on abstractions — the interfaces in this SDK. A plugin author
implements those interfaces; the host (Plugin Manager) wires the plugin
in at runtime. The core's source code never mentions a plugin by name.

```
Plugin author's code  ──implements──►  SDK contracts (interfaces)  ◄──implements/consumes── Core (Dashboard, Plugin Manager)
```

## What's in the SDK

```
platform/sdk/
  types/
    manifest.ts       PluginManifest, PluginId, PluginVersion, ExtensionPointKind, PluginSignature
    permissions.ts     PermissionScope, PermissionGrant, PermissionRequest
    lifecycle.ts       PluginLifecycleState + canTransition() state machine
    context.ts         PluginContext, PluginEventAccess, PluginConfigAccess, PluginLogger
  contracts/
    plugin.ts           IPlugin -- the one interface every plugin implements
    extensions.ts        the 7 extension contracts (IWidgetExtension, IDashboardPageExtension, ...)
    registrar.ts          ExtensionPort<T>, ExtensionRegistrar
  registry/
    pluginRegistry.ts    definePlugin() -- automatic registration
```

## Types, contracts, lifecycle, permissions, registration

### Manifest (`types/manifest.ts`)

Every plugin declares a `PluginManifest`: `id` (reverse-domain, e.g.
`"com.example.my-plugin"`), `version`, `minHostVersion`/`maxHostVersion`,
`dependencies` (other plugin ids -> minimum version), `extensionPoints`
(which of the 7 kinds it touches), `permissions` (which scopes it needs),
and an optional `signature` (see `PLUGIN_API.md`'s Marketplace section).

### Permissions (`types/permissions.ts`)

A closed union of scopes — `read:activities`, `read:metrics`,
`contribute:widgets`, `network:external`, etc. A plugin only ever gets a
`PluginContext` scoped to the scopes it declared; `context.hasPermission(scope)`
answers for *this plugin only*.

### Lifecycle (`types/lifecycle.ts`)

```
registered ──install──► installed ──enable──► enabled
                             │  ▲                │
                             │  └────disable──────┘
                             │
                        uninstall
                             │
                             ▼
                       uninstalled
```

`error` is reachable from any active state when a lifecycle hook throws;
`canTransition(from, to)` is the one function that decides whether a
transition is legal — the Plugin Manager never hand-checks this inline.

### Context (`types/context.ts`)

`PluginContext` is the entire surface a plugin has onto the host:

```ts
interface PluginContext<TConfig = unknown> {
  pluginId: string;
  permissions: readonly PermissionScope[];
  hasPermission(scope: PermissionScope): boolean;
  events: { subscribe, publish };   // scoped view of the Event Bus
  config: { get(): TConfig | null; set(value: TConfig): void };  // scoped to this plugin's own config
  logger: { info, warn, error };
}
```

### Contracts (`contracts/`)

`IPlugin` — the one interface every plugin implements:

```ts
interface IPlugin<TConfig = unknown> {
  manifest: PluginManifest;
  onInstall?(context: PluginContext<TConfig>): void | Promise<void>;
  onEnable?(context: PluginContext<TConfig>, registrar: ExtensionRegistrar): void | Promise<void>;
  onDisable?(context: PluginContext<TConfig>): void | Promise<void>;
  onUninstall?(context: PluginContext<TConfig>): void | Promise<void>;
  onConfigChange?(context: PluginContext<TConfig>, newConfig: TConfig): void;
}
```

Every hook is optional. `onEnable` is the only hook that also receives an
`ExtensionRegistrar` — contributions must not outlive the enabled state,
so `.contribute(...)` is only reachable from there.

The 7 extension contracts (`IWidgetExtension`, `IDashboardPageExtension`,
`IMetricExtension`, `IInsightExtension`, `IRecommendationExtension`,
`IIntegrationExtension`, `IAiCommandExtension`) are documented in
`PLUGIN_API.md`.

### Automatic registration (`registry/pluginRegistry.ts`)

```ts
import { definePlugin } from "platform/sdk";

export default definePlugin({
  manifest: { /* ... */ },
  onEnable(context, registrar) { /* ... */ },
});
```

Calling `definePlugin` is the entire "registration" step — no central
switch statement, no host-side list of known plugins to edit. Importing a
plugin's entry module is what registers it; `listRegisteredPlugins()` is
how a host (or the Plugin Manager) discovers what's available.

## What the SDK deliberately does not include

- No Supabase client, no `fetch`, no DOM APIs beyond what `React.ReactNode`
  implies for widget/page rendering.
- No way to import an Engine module directly. A plugin only ever sees
  already-computed data handed to it as a plain argument (e.g.
  `IInsightExtension.analyze({ activities, metricsHistory })`).
- No way to enumerate or affect another plugin. `ExtensionPort.revoke`
  only ever removes *your own* contribution — see `manager/scopedRegistrar.ts`
  in `PLUGIN_API.md`.

See `PLUGIN_API.md` for the full public API reference, `PLUGIN_DEVELOPER_GUIDE.md`
for a step-by-step walkthrough, and `PLUGIN_EXAMPLES.md` for working code.
