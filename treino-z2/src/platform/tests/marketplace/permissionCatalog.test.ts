import { describe, expect, it } from "vitest";
import { describePermission, PERMISSION_CATALOG } from "../../marketplace/permissionCatalog";

describe("PERMISSION_CATALOG", () => {
  it("has a unique entry for every scope", () => {
    const scopes = PERMISSION_CATALOG.map((e) => e.scope);
    expect(new Set(scopes).size).toBe(scopes.length);
  });

  it("every entry has a non-empty label, description and a valid risk level", () => {
    for (const entry of PERMISSION_CATALOG) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(entry.risk);
    }
  });
});

describe("describePermission", () => {
  it("returns the catalog entry for a known scope", () => {
    expect(describePermission("network:external")?.risk).toBe("high");
  });

  it("returns null for an unknown scope", () => {
    expect(describePermission("not-a-real-scope" as never)).toBeNull();
  });
});
