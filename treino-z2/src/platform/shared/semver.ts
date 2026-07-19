// Minimal semver comparator -- just enough for "is this plugin compatible
// with this host/dependency version", not a full semver range grammar
// (no `^`/`~`/pre-release tags). Shared by manager/ (host + dependency
// version checks at install time) and marketplace/ (compatibility
// checker), so there is exactly one place that parses a version string.

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

export class InvalidVersionError extends Error {}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version: string): ParsedVersion {
  const match = VERSION_PATTERN.exec(version.trim());
  if (!match) throw new InvalidVersionError(`"${version}" is not a valid "major.minor.patch" version string.`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

export function isVersionGte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}

/** True when `version` falls within [min, max] -- max is inclusive, or unbounded above when null. */
export function isVersionInRange(version: string, min: string, max: string | null): boolean {
  if (compareVersions(version, min) < 0) return false;
  if (max != null && compareVersions(version, max) > 0) return false;
  return true;
}
