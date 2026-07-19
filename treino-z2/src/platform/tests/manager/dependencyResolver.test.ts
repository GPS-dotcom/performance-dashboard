import { describe, expect, it } from "vitest";
import { resolveDependencyOrder } from "../../manager/dependencyResolver";
import type { DependencyResolutionInput } from "../../manager/dependencyResolver";

describe("resolveDependencyOrder", () => {
  it("returns each plugin with no dependencies in input order", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "a", version: "1.0.0", dependencies: {} },
      { id: "b", version: "1.0.0", dependencies: {} },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.errors).toEqual([]);
    expect(result.order).toEqual(["a", "b"]);
  });

  it("orders a dependency before its dependent", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "dependent", version: "1.0.0", dependencies: { base: "1.0.0" } },
      { id: "base", version: "1.0.0", dependencies: {} },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.errors).toEqual([]);
    expect(result.order.indexOf("base")).toBeLessThan(result.order.indexOf("dependent"));
  });

  it("reports a missing dependency", () => {
    const plugins: DependencyResolutionInput[] = [{ id: "a", version: "1.0.0", dependencies: { ghost: "1.0.0" } }];
    const result = resolveDependencyOrder(plugins);
    expect(result.errors).toEqual([{ kind: "missing", pluginId: "a", missingDependencyId: "ghost" }]);
  });

  it("reports a version mismatch when the installed dependency is too old", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "a", version: "1.0.0", dependencies: { base: "2.0.0" } },
      { id: "base", version: "1.5.0", dependencies: {} },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.errors).toEqual([{ kind: "version-mismatch", pluginId: "a", dependencyId: "base", required: "2.0.0", found: "1.5.0" }]);
  });

  it("does not report a mismatch when the installed dependency exactly meets the requirement", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "a", version: "1.0.0", dependencies: { base: "1.0.0" } },
      { id: "base", version: "1.0.0", dependencies: {} },
    ];
    expect(resolveDependencyOrder(plugins).errors).toEqual([]);
  });

  it("detects a direct circular dependency and returns an empty order", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "a", version: "1.0.0", dependencies: { b: "1.0.0" } },
      { id: "b", version: "1.0.0", dependencies: { a: "1.0.0" } },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.order).toEqual([]);
    expect(result.errors.some((e) => e.kind === "circular")).toBe(true);
  });

  it("detects a longer circular chain (a -> b -> c -> a)", () => {
    const plugins: DependencyResolutionInput[] = [
      { id: "a", version: "1.0.0", dependencies: { b: "1.0.0" } },
      { id: "b", version: "1.0.0", dependencies: { c: "1.0.0" } },
      { id: "c", version: "1.0.0", dependencies: { a: "1.0.0" } },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.order).toEqual([]);
    expect(result.errors.some((e) => e.kind === "circular")).toBe(true);
  });

  it("resolves a diamond dependency graph without error", () => {
    // top depends on left and right, both of which depend on base.
    const plugins: DependencyResolutionInput[] = [
      { id: "top", version: "1.0.0", dependencies: { left: "1.0.0", right: "1.0.0" } },
      { id: "left", version: "1.0.0", dependencies: { base: "1.0.0" } },
      { id: "right", version: "1.0.0", dependencies: { base: "1.0.0" } },
      { id: "base", version: "1.0.0", dependencies: {} },
    ];
    const result = resolveDependencyOrder(plugins);
    expect(result.errors).toEqual([]);
    expect(result.order.indexOf("base")).toBeLessThan(result.order.indexOf("left"));
    expect(result.order.indexOf("base")).toBeLessThan(result.order.indexOf("right"));
    expect(result.order.indexOf("left")).toBeLessThan(result.order.indexOf("top"));
    expect(result.order.indexOf("right")).toBeLessThan(result.order.indexOf("top"));
  });

  it("handles an empty input", () => {
    expect(resolveDependencyOrder([])).toEqual({ order: [], errors: [] });
  });
});
