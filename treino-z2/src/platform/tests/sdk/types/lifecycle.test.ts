import { describe, expect, it } from "vitest";
import { canTransition } from "../../../sdk/types/lifecycle";
import type { PluginLifecycleState } from "../../../sdk/types/lifecycle";

describe("canTransition", () => {
  it("allows the full happy-path lifecycle", () => {
    expect(canTransition("registered", "installed")).toBe(true);
    expect(canTransition("installed", "enabled")).toBe(true);
    expect(canTransition("enabled", "disabled")).toBe(true);
    expect(canTransition("disabled", "enabled")).toBe(true);
    expect(canTransition("disabled", "uninstalled")).toBe(true);
    expect(canTransition("enabled", "uninstalled")).toBe(true);
    expect(canTransition("installed", "uninstalled")).toBe(true);
  });

  it("allows any active state to transition to error", () => {
    expect(canTransition("registered", "error")).toBe(true);
    expect(canTransition("installed", "error")).toBe(true);
    expect(canTransition("enabled", "error")).toBe(true);
    expect(canTransition("disabled", "error")).toBe(true);
  });

  it("allows recovering from error only by uninstalling", () => {
    expect(canTransition("error", "uninstalled")).toBe(true);
    expect(canTransition("error", "installed")).toBe(false);
    expect(canTransition("error", "enabled")).toBe(false);
  });

  it("uninstalled is terminal", () => {
    const targets: PluginLifecycleState[] = ["registered", "installed", "enabled", "disabled", "error", "uninstalled"];
    for (const target of targets) {
      expect(canTransition("uninstalled", target)).toBe(false);
    }
  });

  it("rejects skipping straight from registered to enabled", () => {
    expect(canTransition("registered", "enabled")).toBe(false);
  });

  it("rejects enabling directly from registered without install", () => {
    expect(canTransition("registered", "disabled")).toBe(false);
  });
});
