import { describe, expect, it } from "vitest";
import { compareVersions, InvalidVersionError, isVersionGte, isVersionInRange, parseVersion } from "../../shared/semver";

describe("parseVersion", () => {
  it("parses a valid major.minor.patch string", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("throws InvalidVersionError for a malformed string", () => {
    expect(() => parseVersion("1.2")).toThrow(InvalidVersionError);
    expect(() => parseVersion("not-a-version")).toThrow(InvalidVersionError);
  });

  it("trims surrounding whitespace", () => {
    expect(parseVersion(" 1.2.3 ")).toEqual({ major: 1, minor: 2, patch: 3 });
  });
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("compares major first", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
  });

  it("compares minor when major is equal", () => {
    expect(compareVersions("1.3.0", "1.2.9")).toBe(1);
    expect(compareVersions("1.2.9", "1.3.0")).toBe(-1);
  });

  it("compares patch when major and minor are equal", () => {
    expect(compareVersions("1.2.4", "1.2.3")).toBe(1);
    expect(compareVersions("1.2.3", "1.2.4")).toBe(-1);
  });
});

describe("isVersionGte", () => {
  it("is true when equal or greater, false when lesser", () => {
    expect(isVersionGte("1.2.3", "1.2.3")).toBe(true);
    expect(isVersionGte("1.2.4", "1.2.3")).toBe(true);
    expect(isVersionGte("1.2.2", "1.2.3")).toBe(false);
  });
});

describe("isVersionInRange", () => {
  it("is true within an inclusive [min, max] range", () => {
    expect(isVersionInRange("1.5.0", "1.0.0", "2.0.0")).toBe(true);
    expect(isVersionInRange("1.0.0", "1.0.0", "2.0.0")).toBe(true);
    expect(isVersionInRange("2.0.0", "1.0.0", "2.0.0")).toBe(true);
  });

  it("is false below min or above max", () => {
    expect(isVersionInRange("0.9.0", "1.0.0", "2.0.0")).toBe(false);
    expect(isVersionInRange("2.0.1", "1.0.0", "2.0.0")).toBe(false);
  });

  it("treats a null max as unbounded above", () => {
    expect(isVersionInRange("99.0.0", "1.0.0", null)).toBe(true);
  });
});
