import { parseVersion } from "../shared/semver";
import type { PluginManifest } from "../sdk/types/manifest";
import { PERMISSION_CATALOG } from "./permissionCatalog";

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

const KNOWN_PERMISSION_SCOPES = new Set(PERMISSION_CATALOG.map((entry) => entry.scope));
const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/; // reverse-domain style, e.g. "com.example.my-plugin"

function isValidVersionString(version: unknown): boolean {
  if (typeof version !== "string") return false;
  try {
    parseVersion(version);
    return true;
  } catch {
    return false;
  }
}

/**
 * FASE 5's "manifesto"/"metadados": everything a marketplace (or the
 * Plugin Manager, before even attempting `install()`) should check
 * *before* running a single line of the plugin's code. Deliberately a
 * pure function over a `PluginManifest`-shaped value (not `unknown`,
 * since TypeScript already keeps a malformed manifest from compiling for
 * an in-repo plugin) -- it exists to catch manifests a marketplace
 * received as raw JSON from a third party, where the type system can't
 * help.
 */
export function validatePluginManifest(manifest: PluginManifest): ManifestValidationResult {
  const errors: string[] = [];

  if (!manifest.id || !ID_PATTERN.test(manifest.id)) {
    errors.push(`"id" must be reverse-domain style (e.g. "com.example.my-plugin"), got "${manifest.id}".`);
  }
  if (!manifest.name || manifest.name.trim() === "") {
    errors.push('"name" must not be empty.');
  }
  if (!isValidVersionString(manifest.version)) {
    errors.push(`"version" must be a "major.minor.patch" string, got "${manifest.version}".`);
  }
  if (!isValidVersionString(manifest.minHostVersion)) {
    errors.push(`"minHostVersion" must be a "major.minor.patch" string, got "${manifest.minHostVersion}".`);
  }
  if (manifest.maxHostVersion != null && !isValidVersionString(manifest.maxHostVersion)) {
    errors.push(`"maxHostVersion" must be null or a "major.minor.patch" string, got "${manifest.maxHostVersion}".`);
  }
  if (!manifest.author || !manifest.author.name || manifest.author.name.trim() === "") {
    errors.push('"author.name" must not be empty.');
  }
  for (const [depId, depVersion] of Object.entries(manifest.dependencies ?? {})) {
    if (!isValidVersionString(depVersion)) {
      errors.push(`dependency "${depId}" has an invalid version requirement "${depVersion}".`);
    }
  }
  for (const scope of manifest.permissions ?? []) {
    if (!KNOWN_PERMISSION_SCOPES.has(scope)) {
      errors.push(`"${scope}" is not a known permission scope.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
