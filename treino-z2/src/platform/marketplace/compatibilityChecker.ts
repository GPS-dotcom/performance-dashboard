import { isVersionInRange } from "../shared/semver";
import type { PluginManifest } from "../sdk/types/manifest";

export interface CompatibilityResult {
  compatible: boolean;
  reason: string | null;
}

/**
 * FASE 5's "compatibilidade": the same host-version range check
 * manager/pluginManager.ts runs at install time, exposed standalone so a
 * future marketplace listing can show "Compatible with your version" (or
 * not) *before* the athlete ever attempts to install -- install() itself
 * still re-checks this; a marketplace UI must never be the only place
 * this is enforced.
 */
export function checkHostCompatibility(manifest: PluginManifest, hostVersion: string): CompatibilityResult {
  if (isVersionInRange(hostVersion, manifest.minHostVersion, manifest.maxHostVersion)) {
    return { compatible: true, reason: null };
  }
  const upperBound = manifest.maxHostVersion ? `-${manifest.maxHostVersion}` : "+";
  return { compatible: false, reason: `"${manifest.name}" requires host version ${manifest.minHostVersion}${upperBound}, but the running host is ${hostVersion}.` };
}
