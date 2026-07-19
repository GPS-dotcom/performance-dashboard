import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "../errorMessage";

describe("extractErrorMessage", () => {
  it("reads .message off a real Error instance", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads .message off a plain object shaped like an error (e.g. a network-level postgrest-js failure)", () => {
    expect(extractErrorMessage({ message: "TypeError: Failed to fetch" })).toBe("TypeError: Failed to fetch");
  });

  it("falls back to String() for a plain string", () => {
    expect(extractErrorMessage("plain string")).toBe("plain string");
  });

  it("falls back to String() for null/undefined", () => {
    expect(extractErrorMessage(null)).toBe("null");
    expect(extractErrorMessage(undefined)).toBe("undefined");
  });

  it("falls back to String() for an object with no .message (avoids '[object Object]' only when message exists)", () => {
    expect(extractErrorMessage({ code: "PGRST301" })).toBe("[object Object]");
  });

  it("falls back to String() when .message is present but not a string", () => {
    expect(extractErrorMessage({ message: 42 })).toBe("[object Object]");
  });
});
