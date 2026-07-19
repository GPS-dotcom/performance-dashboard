import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "../../marketplace/manifestValidation";
import type { PluginManifest } from "../../sdk/types/manifest";

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "com.example.my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    description: "A plugin.",
    author: { name: "Someone" },
    minHostVersion: "1.0.0",
    maxHostVersion: null,
    dependencies: {},
    extensionPoints: [],
    permissions: [],
    signature: null,
    ...overrides,
  };
}

describe("validatePluginManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(validatePluginManifest(makeManifest())).toEqual({ valid: true, errors: [] });
  });

  it("rejects a non reverse-domain id", () => {
    const result = validatePluginManifest(makeManifest({ id: "not-reverse-domain" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = validatePluginManifest(makeManifest({ name: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("rejects an invalid version", () => {
    const result = validatePluginManifest(makeManifest({ version: "v1" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("rejects an invalid minHostVersion", () => {
    const result = validatePluginManifest(makeManifest({ minHostVersion: "not-a-version" }));
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid non-null maxHostVersion but accepts a null one", () => {
    expect(validatePluginManifest(makeManifest({ maxHostVersion: "bad" })).valid).toBe(false);
    expect(validatePluginManifest(makeManifest({ maxHostVersion: "2.0.0" })).valid).toBe(true);
  });

  it("rejects an empty author name", () => {
    const result = validatePluginManifest(makeManifest({ author: { name: "" } }));
    expect(result.valid).toBe(false);
  });

  it("rejects a dependency with an invalid version requirement", () => {
    const result = validatePluginManifest(makeManifest({ dependencies: { "com.example.base": "not-a-version" } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("com.example.base"))).toBe(true);
  });

  it("accepts a dependency with a valid version requirement", () => {
    expect(validatePluginManifest(makeManifest({ dependencies: { "com.example.base": "1.0.0" } })).valid).toBe(true);
  });

  it("rejects an unknown permission scope", () => {
    const result = validatePluginManifest(makeManifest({ permissions: ["read:activities", "delete:everything" as never] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("delete:everything"))).toBe(true);
  });

  it("accepts every known permission scope", () => {
    expect(validatePluginManifest(makeManifest({ permissions: ["read:activities", "contribute:widgets", "network:external"] })).valid).toBe(true);
  });

  it("collects every error at once rather than stopping at the first", () => {
    const result = validatePluginManifest(makeManifest({ id: "bad id", name: "", version: "bad" }));
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
