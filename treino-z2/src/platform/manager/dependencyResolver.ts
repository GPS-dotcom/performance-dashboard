import { isVersionGte } from "../shared/semver";

export interface DependencyResolutionInput {
  id: string;
  version: string;
  /** Other plugin ids this one requires, mapped to the minimum version required. */
  dependencies: Record<string, string>;
}

export type DependencyError =
  | { kind: "missing"; pluginId: string; missingDependencyId: string }
  | { kind: "version-mismatch"; pluginId: string; dependencyId: string; required: string; found: string }
  | { kind: "circular"; cycle: string[] };

export interface DependencyResolutionResult {
  /** Install order with every dependency appearing before its dependents. Empty when there are blocking errors. */
  order: string[];
  errors: DependencyError[];
}

/**
 * FASE 3's "dependências": given a batch of plugins (each declaring
 * `dependencies: { otherPluginId: minVersion }`), computes a safe install
 * order via topological sort, and reports every missing dependency,
 * version mismatch, or circular dependency found -- without installing
 * anything itself (pure function; manager/pluginManager.ts is the only
 * thing that acts on the result).
 */
export function resolveDependencyOrder(plugins: DependencyResolutionInput[]): DependencyResolutionResult {
  const byId = new Map(plugins.map((p) => [p.id, p]));
  const errors: DependencyError[] = [];

  for (const plugin of plugins) {
    for (const [depId, minVersion] of Object.entries(plugin.dependencies)) {
      const dep = byId.get(depId);
      if (!dep) {
        errors.push({ kind: "missing", pluginId: plugin.id, missingDependencyId: depId });
      } else if (!isVersionGte(dep.version, minVersion)) {
        errors.push({ kind: "version-mismatch", pluginId: plugin.id, dependencyId: depId, required: minVersion, found: dep.version });
      }
    }
  }

  const order: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function visit(id: string, path: string[]): boolean {
    if (visited.has(id)) return true;
    if (inStack.has(id)) {
      errors.push({ kind: "circular", cycle: [...path, id] });
      return false;
    }
    const plugin = byId.get(id);
    if (!plugin) return true; // missing dependency already reported above

    inStack.add(id);
    for (const depId of Object.keys(plugin.dependencies)) {
      if (byId.has(depId)) {
        const ok = visit(depId, [...path, id]);
        if (!ok) {
          inStack.delete(id);
          return false;
        }
      }
    }
    inStack.delete(id);
    visited.add(id);
    order.push(id);
    return true;
  }

  for (const plugin of plugins) {
    if (!visited.has(plugin.id)) visit(plugin.id, []);
  }

  return { order: errors.some((e) => e.kind === "circular") ? [] : order, errors };
}
