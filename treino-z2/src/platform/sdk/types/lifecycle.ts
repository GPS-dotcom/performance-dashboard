/**
 * A plugin's lifecycle, per FASE 1's "ciclo de vida":
 *
 *   registered ──install──► installed ──enable──► enabled
 *        │                      │  ▲                │
 *        │                      │  └────disable──────┘
 *        │                      │
 *        │                 uninstall
 *        │                      │
 *        └──────────────────────▼
 *                          uninstalled
 *
 * "error" is reachable from any state when a lifecycle hook throws --
 * the Plugin Manager catches it, records it, and never lets a broken
 * plugin take the rest of the app down with it.
 */
export type PluginLifecycleState = "registered" | "installed" | "enabled" | "disabled" | "uninstalled" | "error";

const ALLOWED_TRANSITIONS: Record<PluginLifecycleState, PluginLifecycleState[]> = {
  registered: ["installed", "error"],
  installed: ["enabled", "uninstalled", "error"],
  enabled: ["disabled", "uninstalled", "error"],
  disabled: ["enabled", "uninstalled", "error"],
  uninstalled: [],
  error: ["uninstalled"],
};

/** The state machine's only rule, kept in one place so the Plugin Manager never has to hand-check it inline. */
export function canTransition(from: PluginLifecycleState, to: PluginLifecycleState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
