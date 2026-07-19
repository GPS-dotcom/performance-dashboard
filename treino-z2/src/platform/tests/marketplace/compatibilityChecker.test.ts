import { describe, expect, it } from "vitest";
import { checkHostCompatibility } from "../../marketplace/compatibilityChecker";
import type { PluginManifest } from "../../sdk/types/manifest";

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "com.example.a",
    name: "A",
    version: "1.0.0",
    description: "d",
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

describe("checkHostCompatibility", () => {
  it("is compatible when the host version is within [min, max]", () => {
    const result = checkHostCompatibility(makeManifest({ minHostVersion: "1.0.0", maxHostVersion: "2.0.0" }), "1.5.0");
    expect(result).toEqual({ compatible: true, reason: null });
  });

  it("is compatible when maxHostVersion is null (unbounded above)", () => {
    expect(checkHostCompatibility(makeManifest({ minHostVersion: "1.0.0", maxHostVersion: null }), "99.0.0").compatible).toBe(true);
  });

  it("is incompatible and explains why when the host is below minHostVersion", () => {
    const result = checkHostCompatibility(makeManifest({ minHostVersion: "2.0.0", maxHostVersion: null }), "1.0.0");
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain("2.0.0+");
  });

  it("is incompatible and explains why when the host is above maxHostVersion", () => {
    const result = checkHostCompatibility(makeManifest({ minHostVersion: "1.0.0", maxHostVersion: "1.5.0" }), "2.0.0");
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain("1.0.0-1.5.0");
  });
});
