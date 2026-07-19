// Plugin SDK public surface (FASE 1).
//
// This is the entire package a plugin author imports from -- everything
// under sdk/ is interfaces, types and the registration helper; there is
// no implementation here that touches a real Engine, Supabase, or the
// DOM. Concrete implementations (the Plugin Manager, the extension point
// registries, the Event Bus singleton) live in manager/, extensions/ and
// events/ respectively, and are imported by the *host*, never required by
// a plugin to compile against this SDK.

export * from "./types";
export * from "./contracts";
export * from "./registry";
