import { describe, expect, it } from "vitest";
import { appPluginManager } from "../../manager/appPluginManager";
import { PluginManager } from "../../manager/pluginManager";

describe("appPluginManager", () => {
  it("is a PluginManager instance, shared by the whole app", () => {
    expect(appPluginManager).toBeInstanceOf(PluginManager);
    expect(appPluginManager.list()).toEqual([]);
  });
});
