import type { PermissionScope } from "../sdk/types/permissions";

export type PermissionRisk = "low" | "medium" | "high";

export interface PermissionCatalogEntry {
  scope: PermissionScope;
  label: string;
  description: string;
  risk: PermissionRisk;
}

/**
 * FASE 5's "permissões": a human-readable description of every scope in
 * `sdk/types/permissions.ts`, for a future marketplace install screen
 * ("this plugin wants to: ..."). Read-only access is `"low"` risk,
 * contributing UI/data is `"medium"`, and anything that leaves the
 * device (`network:external`) is `"high"` -- the same three-tier model
 * mobile app stores use.
 */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { scope: "read:activities", label: "Read activities", description: "Read the athlete's imported activity history.", risk: "low" },
  { scope: "read:metrics", label: "Read metrics", description: "Read CTL/ATL/TSB and other Metrics Engine output.", risk: "low" },
  { scope: "read:insights", label: "Read insights", description: "Read Intelligence Engine insights.", risk: "low" },
  { scope: "read:predictions", label: "Read predictions", description: "Read Prediction Engine forecasts.", risk: "low" },
  { scope: "read:recommendations", label: "Read recommendations", description: "Read Coach Engine recommendations and alerts.", risk: "low" },
  { scope: "read:athlete-profile", label: "Read athlete profile", description: "Read FTP, weight, thresholds and other profile fields.", risk: "medium" },
  { scope: "contribute:widgets", label: "Add widgets", description: "Add a widget to a Dashboard page.", risk: "medium" },
  { scope: "contribute:dashboard-pages", label: "Add dashboard pages", description: "Add an entirely new page to the Dashboard nav.", risk: "medium" },
  { scope: "contribute:metrics", label: "Add metrics", description: "Contribute a custom, presentation-adjacent metric.", risk: "medium" },
  { scope: "contribute:insights", label: "Add insights", description: "Contribute plugin-sourced insights, shown in their own stream.", risk: "medium" },
  { scope: "contribute:recommendations", label: "Add recommendations", description: "Contribute plugin-sourced recommendations, shown in their own stream.", risk: "medium" },
  { scope: "contribute:integrations", label: "Add integrations", description: "Register a third-party integration.", risk: "medium" },
  { scope: "contribute:ai-commands", label: "Add AI commands", description: "Register a command the AI Assistant can invoke.", risk: "medium" },
  { scope: "network:external", label: "Access the network", description: "Make requests to a third-party service outside this app.", risk: "high" },
  { scope: "storage:plugin-config", label: "Store configuration", description: "Persist this plugin's own configuration.", risk: "low" },
];

export function describePermission(scope: PermissionScope): PermissionCatalogEntry | null {
  return PERMISSION_CATALOG.find((entry) => entry.scope === scope) ?? null;
}
