// Plugin SDK -- permission model.
//
// Every capability a plugin can touch is named here as an explicit scope.
// A plugin declares the scopes it needs in its manifest (marketplace/
// permissionCatalog.ts describes each one for a human reviewer); the
// Plugin Manager only ever hands a plugin a PluginContext scoped to the
// scopes it actually declared -- a plugin that never asked for
// "write:recommendations" cannot call `context.recommendations.contribute`,
// because that capability is never present on its context object in the
// first place (capability-based, not just a runtime check).

export type PermissionScope =
  // Read access to already-computed Engine output.
  | "read:activities"
  | "read:metrics"
  | "read:insights"
  | "read:predictions"
  | "read:recommendations"
  | "read:athlete-profile"
  // Write/contribute access to an extension point.
  | "contribute:widgets"
  | "contribute:dashboard-pages"
  | "contribute:metrics"
  | "contribute:insights"
  | "contribute:recommendations"
  | "contribute:integrations"
  | "contribute:ai-commands"
  // Cross-cutting.
  | "network:external"
  | "storage:plugin-config";

export interface PermissionGrant {
  scope: PermissionScope;
  grantedAt: string; // ISO timestamp
}

/** What a manifest asks for, before the host has decided anything. */
export type PermissionRequest = PermissionScope[];
