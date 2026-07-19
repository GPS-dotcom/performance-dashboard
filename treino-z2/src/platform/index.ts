// Plugin Platform public surface.
//
// Per this task's 6 phases: sdk/ (interfaces/types/contracts/lifecycle/
// permissions/registry), events/ (the Event Bus), manager/ (install/
// enable/disable/uninstall/dependencies/isolation/config), extensions/
// (the 7 contribution points core reads from generically), marketplace/
// (manifest validation/compatibility/signature/permission catalog, in
// preparation for a future plugin marketplace).
//
// The core (metrics/intelligence/prediction/coach/dashboard) never
// imports a specific plugin -- it only ever imports from here (an
// abstraction layer) or, for the one generic UI touchpoint
// (dashboard/widgets/PluginWidgetSlot.tsx), from extensions/points.ts's
// `widgetExtensionPoint`. See PLUGIN_PLATFORM_REPORT.md for the full
// architecture writeup.

export * from "./sdk";
export * from "./events";
export * from "./manager";
export * from "./extensions";
export * from "./marketplace";
