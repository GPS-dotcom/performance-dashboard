import { describe, expect, it, vi } from "vitest";
import { createPluginContext } from "../../manager/pluginContextFactory";
import { EventBus } from "../../events/eventBus";
import type { PlatformEventMap } from "../../events/types";
import { createInMemoryPluginConfigStore } from "../../manager/configStore";

describe("createPluginContext", () => {
  it("scopes hasPermission to exactly the granted scopes", () => {
    const context = createPluginContext("p1", ["read:activities"], new EventBus<PlatformEventMap>(), createInMemoryPluginConfigStore());
    expect(context.hasPermission("read:activities")).toBe(true);
    expect(context.hasPermission("network:external")).toBe(false);
    expect(context.permissions).toEqual(["read:activities"]);
    expect(context.pluginId).toBe("p1");
  });

  it("events.subscribe/publish delegate to the given EventBus", () => {
    const bus = new EventBus<PlatformEventMap>();
    const context = createPluginContext("p1", [], bus, createInMemoryPluginConfigStore());
    const handler = vi.fn();
    context.events.subscribe("ShoeRetired", handler);
    context.events.publish("ShoeRetired", { athleteId: null, shoeName: "Pegasus", totalDistanceKm: 500, retiredAt: "2026-07-19" });
    expect(handler).toHaveBeenCalledWith({ athleteId: null, shoeName: "Pegasus", totalDistanceKm: 500, retiredAt: "2026-07-19" });
  });

  it("config.get/set are scoped to this plugin's id in the given store", () => {
    const store = createInMemoryPluginConfigStore();
    const contextA = createPluginContext("plugin-a", [], new EventBus<PlatformEventMap>(), store);
    const contextB = createPluginContext("plugin-b", [], new EventBus<PlatformEventMap>(), store);

    contextA.config.set({ value: "a" });
    expect(contextA.config.get()).toEqual({ value: "a" });
    expect(contextB.config.get()).toBeNull();
  });

  it("logger methods delegate to console with a plugin-id prefix", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const context = createPluginContext("p1", [], new EventBus<PlatformEventMap>(), createInMemoryPluginConfigStore());

    context.logger.info("hello", 1);
    context.logger.warn("careful");
    context.logger.error("oops");

    expect(infoSpy).toHaveBeenCalledWith("[plugin:p1]", "hello", 1);
    expect(warnSpy).toHaveBeenCalledWith("[plugin:p1]", "careful");
    expect(errorSpy).toHaveBeenCalledWith("[plugin:p1]", "oops");

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
