import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePluginRegistryVersion } from "../../hooks/usePluginRegistryVersion";
import { platformEventBus } from "../../../platform/events/platformEventBus";

describe("usePluginRegistryVersion", () => {
  it("starts at 0", () => {
    const { result } = renderHook(() => usePluginRegistryVersion());
    expect(result.current).toBe(0);
  });

  it.each(["PluginInstalled", "PluginEnabled", "PluginDisabled", "PluginUninstalled"] as const)("bumps the version when %s is published", (eventType) => {
    const { result } = renderHook(() => usePluginRegistryVersion());
    act(() => {
      platformEventBus.publish(eventType, { pluginId: "com.example.a" } as never);
    });
    expect(result.current).toBe(1);
  });

  it("stops updating after unmount", () => {
    const { result, unmount } = renderHook(() => usePluginRegistryVersion());
    unmount();
    act(() => {
      platformEventBus.publish("PluginEnabled", { pluginId: "com.example.a" });
    });
    expect(result.current).toBe(0);
  });
});
