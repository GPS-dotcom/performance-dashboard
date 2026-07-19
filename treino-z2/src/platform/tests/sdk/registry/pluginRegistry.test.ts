import { afterEach, describe, expect, it } from "vitest";
import { __clearPluginRegistryForTests, definePlugin, getRegisteredPlugin, listRegisteredPlugins, PluginRegistrationError } from "../../../sdk/registry/pluginRegistry";
import type { IPlugin } from "../../../sdk/contracts/plugin";

function makePlugin(id: string): IPlugin {
  return {
    manifest: {
      id,
      name: id,
      version: "1.0.0",
      description: "test plugin",
      author: { name: "Test" },
      minHostVersion: "1.0.0",
      maxHostVersion: null,
      dependencies: {},
      extensionPoints: [],
      permissions: [],
      signature: null,
    },
  };
}

afterEach(() => {
  __clearPluginRegistryForTests();
});

describe("definePlugin", () => {
  it("registers a plugin and returns it unchanged", () => {
    const plugin = makePlugin("com.example.a");
    const result = definePlugin(plugin);
    expect(result).toBe(plugin);
    expect(listRegisteredPlugins()).toContain(plugin);
  });

  it("throws when the manifest id is empty", () => {
    const plugin = makePlugin("");
    expect(() => definePlugin(plugin)).toThrow(PluginRegistrationError);
  });

  it("throws when the manifest id is only whitespace", () => {
    const plugin = makePlugin("   ");
    expect(() => definePlugin(plugin)).toThrow(PluginRegistrationError);
  });

  it("throws when the same id is registered twice", () => {
    definePlugin(makePlugin("com.example.dup"));
    expect(() => definePlugin(makePlugin("com.example.dup"))).toThrow(PluginRegistrationError);
  });
});

describe("listRegisteredPlugins / getRegisteredPlugin", () => {
  it("lists every registered plugin in registration order", () => {
    definePlugin(makePlugin("com.example.first"));
    definePlugin(makePlugin("com.example.second"));
    expect(listRegisteredPlugins().map((p) => p.manifest.id)).toEqual(["com.example.first", "com.example.second"]);
  });

  it("returns null for an id that was never registered", () => {
    expect(getRegisteredPlugin("com.example.missing")).toBeNull();
  });

  it("returns the registered plugin by id", () => {
    const plugin = definePlugin(makePlugin("com.example.findme"));
    expect(getRegisteredPlugin("com.example.findme")).toBe(plugin);
  });
});
