import { describe, expect, it } from "vitest";
import { createExtensionPoint, DuplicateExtensionError } from "../../extensions/extensionPointBase";

interface TestExtension {
  id: string;
  label: string;
}

describe("createExtensionPoint", () => {
  it("starts empty", () => {
    const point = createExtensionPoint<TestExtension>("test");
    expect(point.list()).toEqual([]);
    expect(point.get("missing")).toBeNull();
  });

  it("contribute() adds an extension, retrievable via list() and get()", () => {
    const point = createExtensionPoint<TestExtension>("test");
    const ext = { id: "a", label: "A" };
    point.contribute(ext);
    expect(point.list()).toEqual([ext]);
    expect(point.get("a")).toEqual(ext);
  });

  it("contribute() throws DuplicateExtensionError for a repeated id", () => {
    const point = createExtensionPoint<TestExtension>("test");
    point.contribute({ id: "a", label: "A" });
    expect(() => point.contribute({ id: "a", label: "A2" })).toThrow(DuplicateExtensionError);
  });

  it("revoke() removes a contribution; revoking an unknown id is a no-op", () => {
    const point = createExtensionPoint<TestExtension>("test");
    point.contribute({ id: "a", label: "A" });
    point.revoke("a");
    expect(point.list()).toEqual([]);
    expect(() => point.revoke("never-existed")).not.toThrow();
  });

  it("keeps two extension points instances fully independent", () => {
    const pointA = createExtensionPoint<TestExtension>("a");
    const pointB = createExtensionPoint<TestExtension>("b");
    pointA.contribute({ id: "shared-id", label: "from A" });
    pointB.contribute({ id: "shared-id", label: "from B" });
    expect(pointA.get("shared-id")?.label).toBe("from A");
    expect(pointB.get("shared-id")?.label).toBe("from B");
  });
});
